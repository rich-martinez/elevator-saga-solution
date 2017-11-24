const config = {
    init (elevators, floors) {
        const elevatorsWithIdsAndDirection = elevators.map((currentElevator, id) => {
            currentElevator.id = id;
            currentElevator.lastDestinationDirection = undefined;

            return currentElevator;
        });

        elevatorsWithIdsAndDirection.forEach(function (elevator) {
            const activeButtonState = 'activated';

            function getDirectionIndicator(currentFloorNumber, destinationDirection = undefined) {
                const floorNumbers = floors.map(function (floor) {
                    return floor.floorNum();
                });
                const topFloorNumber = Math.max(...floorNumbers);
                const bottomFloorNumber = Math.min(...floorNumbers);

                if (currentFloorNumber === bottomFloorNumber) {
                    return 'up';
                } else if (currentFloorNumber === topFloorNumber) {
                    return 'down';
                } else if (destinationDirection !== undefined) {
                    return destinationDirection;
                }

                return undefined;
            }

            // attempt to set the destination direction up/down
            function setDirectionIndicator(currentFloorNumber, destinationDirection = undefined) {
                const theDestinationDirection = getDirectionIndicator(currentFloorNumber, destinationDirection);

                if (!theDestinationDirection || theDestinationDirection === 'stopped') {
                    console.error('Cannot set destination direction of: ' + theDestinationDirection);
                    return undefined;
                }

                switch (theDestinationDirection) {
                    case 'up':
                        elevator.goingUpIndicator(true);
                        elevator.goingDownIndicator(false);
                        break;
                    case 'down':
                        elevator.goingUpIndicator(false);
                        elevator.goingDownIndicator(true);
                        break;
                }

                return theDestinationDirection;
            }

            function getRemainingFloorsSortedUsingDirection(
                direction,
                destinationQueue,
                currentFloorNumber
            ) {
                let remainingFloors;

                if (direction === undefined) {
                    //
                    //  Why is this undefined?
                    //  I belive it is undefined if stopped event goes off on starting floor before lastDestinationDirection was set by passing floors event.
                    //
                    console.error('direction cannot be undefined');
                    return undefined;
                }

                switch (direction) {
                        // filter out floors in the destination queue that are not in the same direction
                        // including the current floor (so the elevator doesn't get stuck in a loop for the stopped event)
                    case 'up':
                        remainingFloors = destinationQueue
                            .filter(function (floorNumber) {
                                return floorNumber > currentFloorNumber;
                            })
                            .sort(function (numA, numB) {
                                return numA - numB;
                            });
                        break;
                    case 'down':
                        remainingFloors = destinationQueue
                            .filter(function (floorNumber) {
                                return floorNumber < currentFloorNumber;
                            })
                            .sort(function (numA, numB) {
                                return numA - numB;
                            })
                            .reverse();
                        break;
                }

                return remainingFloors;
            }

            // remove any floors that should not be in destination queue
            function setDestinationQueue(
                destinationQueue,
                pressedFloors
            ) {
                return destinationQueue
                    .filter((floorNumber) => {
                        const buttonStates = Object.values(floors[floorNumber].buttonStates);

                        return (buttonStates.includes(activeButtonState) || pressedFloors.includes(floorNumber));
                    })
                    // filter out any duplicate destination floors
                    .filter((floorNumber, index, self) => {
                        return index === self.indexOf(floorNumber);
                    });
            }

            // should elevator go floor when the floor button was pressed
            function shouldGoToFloor(
                currentFloorNumber,
                currentElevator,
                allElevators
            ) {
                const fullLoadFactorIndicator = 1;
                // all elevators sans the elevator in question
                const allOtherElevators = allElevators.filter((elevator) => {
                    return elevator.id !== currentElevator.id;
                });

                // all elevators that have the current floor in their destination queue
                const allOtherElevatorsGoingToCurrentFloor = allOtherElevators.filter((elevator) => {
                    return elevator.destinationQueue.includes(currentFloorNumber);
                });

                // this is based on if elevator and current elevator are going the same direction
                const allOtherCloserElevators = allOtherElevators.filter((elevator) => {
                    const upIndicator = 'up';
                    const downIndicator = 'down';
                    const elevatorLastDestinationDirection = elevator.lastDestinationDirection;
                    const currentElevatorLastDestinationDirection = currentElevator.lastDestinationDirection;

                    if ((
                            elevatorLastDestinationDirection === upIndicator
                                || elevatorLastDestinationDirection === downIndicator
                        ) && (
                            currentElevatorLastDestinationDirection === upIndicator
                                || currentElevatorLastDestinationDirection === downIndicator
                        )) {
                        console.error('elevator and currentElevator must have lastDestinationDirection of up or down');

                        return undefined;
                    }

                    if (elevatorLastDestinationDirection === currentElevatorLastDestinationDirection) {
                        const elevatorFloorNumber = elevator.currentFloor();
                        const currentElevatorFloorNumber = currentElevator.currentFloor();


                        // if elevator and currentElevator are on the same floor
                        // use elevator.loadFactor() and currentElevator.loadFactor
                        // and if that is the same then use elevator.id compare currentElevator.id
                        if (elevatorFloorNumber === currentElevatorFloorNumber) {
                            const elevatorLoadFactor = elevator.loadFactor();
                            const currentElevatorLoadFactor = elevator.loadFactor();

                            if (elevatorLoadFactor === currentElevatorLoadFactor) {
                                // arbitrarily determine proximity based on id
                                // this is just to make some elevator decideds to go to this floor
                                return elevator.id < currentElevator.id;
                            }

                            // consider elevator closer if it is on the same floor and load factor is less than currentElevator
                            return (elevatorLoadFactor < currentElevatorLoadFactor);
                        }

                        // if direction of elevator and currentElevator does not match
                        // determine direction and then determine if elevator is closer
                        return elevatorLastDestinationDirection === 'up'
                            ? elevatorFloorNumber > currentElevatorFloorNumber
                            : elevatorFloorNumber < currentElevatorFloorNumber;
                    }
                });

                // if this is not based this off of direction
                // An elevator with fewer stops than currentElevator will be assigned the currentFloor
                // However, that may not be entirely desirable if that elevator has to cover more distance
                // with fewer stops, because in that case currentElevator could have made it to the current
                // floor faster than an elevator that would be assigned current floor.
                const allOtherElevatorsWithFewerStops = allOtherElevators.filter((elevator) => {
                        return currentElevator.destinationQueue.length > elevator.destinationQueue.length;
                });

                if (currentElevator.loadFactor() < fullLoadFactorIndicator
                    && allOtherElevatorsGoingToCurrentFloor.length === 0
                    && allOtherCloserElevators.length === 0
                    && allOtherElevatorsWithFewerStops.length === 0
                ) {
                    // current elevator should go to current floor
                    return true;
                }
                // current elevator should not go to current floor;
                return false;
            }

            //
            // for each elevator add listeners for every floor
            //
            floors.forEach(function (floor) {
               const floorNumber = floor.floorNum();

                floor.on('up_button_pressed', function() {
                    console.log(`up button pressed on floor ${floorNumber}`);
                    if (shouldGoToFloor(floorNumber, elevator, elevatorsWithIdsAndDirection)) {
                        elevator.goToFloor(floorNumber);
                    }
                });

                floor.on('down_button_pressed', function() {
                    console.log(`down button pressed on floor ${floorNumber}`);
                    if (shouldGoToFloor(floorNumber, elevator, elevatorsWithIdsAndDirection)) {
                        elevator.goToFloor(floorNumber);
                    }
                });
            });

            elevator.on('floor_button_pressed', function(floorPressed) {
                console.log(`floor button pressed for floor ${floorPressed}`);
                elevator.goToFloor(floorPressed);
            });

            elevator.on('idle', () => {
                const currentFloorNumber = elevator.currentFloor();
                console.log(`the elevator is idle on floor ${currentFloorNumber}`);
                elevator.lastDestinationDirection = setDirectionIndicator(currentFloorNumber, elevator.lastDestinationDirection);
            });

            elevator.on('stopped_at_floor', function (currentFloorNumber) {
                const lastDestinationDirection = elevator.lastDestinationDirection;
                console.log(`stopped at floor number ${currentFloorNumber}`);
                elevator.lastDestinationDirection = setDirectionIndicator(currentFloorNumber, lastDestinationDirection);

                // filter any weirdness in the destination queue
                // such as floor numbers that are not associated with a pressed floor or active button pressed
                elevator.destinationQueue = setDestinationQueue(
                    elevator.destinationQueue,
                    elevator.getPressedFloors()
                );
                // immediately change destination queue to the one assigned above
                elevator.checkDestinationQueue();

                if (lastDestinationDirection) {
                    const remainingFloors = getRemainingFloorsSortedUsingDirection(
                        lastDestinationDirection,
                        elevator.destinationQueue,
                        currentFloorNumber
                    );
                    //  if remaing floors is an array and has length make  the next floor a priority
                    const nextFloorIndex = 0;
                    const nextFloor = Array.isArray(remainingFloors) && remainingFloors.length ? remainingFloors[nextFloorIndex] : undefined;

                    if (typeof nextFloor === 'number') {
                        elevator.goToFloor(nextFloor, true);
                        debugger;
                    }

                    // change the direction if someone is waiting for the elevator on the current floor and there are no remaining
                    // destinations in the current direction
                    if (Array.isArray(remainingFloors) && remainingFloors.length === 0) {
                        const buttonStates = floors[currentFloorNumber].buttonStates;

                        if (lastDestinationDirection === 'up'
                            && buttonStates[lastDestinationDirection] !== activeButtonState
                            && buttonStates['down'] === activeButtonState
                        ) {
                            elevator.lastDestinationDirection = 'down';
                            setDirectionIndicator(currentFloorNumber, elevator.lastDestinationDirection);
                        }

                        if (lastDestinationDirection === 'down'
                            && buttonStates[lastDestinationDirection] !== activeButtonState
                            && buttonStates['up'] === activeButtonState
                        ) {
                            elevator.lastDestinationDirection = 'up';
                            setDirectionIndicator(currentFloorNumber, elevator.lastDestinationDirection);
                        }

                    }
                }

            });

            elevator.on("passing_floor", function(currentFloorNumber, direction) {
                const pressedFloors = elevator.getPressedFloors();
                const buttonStates = floors[currentFloorNumber].buttonStates;

                // set the direction the elevator is traveling in so riders know not to get on if their destination is the opposite direction
                elevator.lastDestinationDirection = setDirectionIndicator(currentFloorNumber, direction);
                console.log(`passing floor number ${currentFloorNumber} and the current direction is ${elevator.lastDestinationDirection}`);

                // go to current floor first if it is in pressed floors array
                // or got to current floor has activated button of the direction the elevator is currently going
                if ((Array.isArray(pressedFloors) && pressedFloors.includes(currentFloorNumber))
                    || (buttonStates[elevator.lastDestinationDirection] === activeButtonState)
                   ) {
                    elevator.goToFloor(currentFloorNumber, true);
                    debugger;
                }
            });
        });
    },
    update (dt, elevators, floors) {
        // We normally don't need to do anything here
    }
};