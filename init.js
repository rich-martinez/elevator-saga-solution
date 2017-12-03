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
                buttonPressed,
                currentFloorNumber,
                currentElevator,
                allElevators
            ) {
                function numberDifference(num1, num2){
                    // difference could be zero
                    return (num1 > num2)
                        ? num1 - num2
                        : num2 - num1
                }

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
                    const elevatorLoadFactor = elevator.loadFactor();
                    const currentElevatorLoadFactor = currentElevator.loadFactor();

                    // elevator and currentElevator are going the same direction
                    if (elevatorLastDestinationDirection === currentElevatorLastDestinationDirection) {
                        const elevatorFloorNumber = elevator.currentFloor();
                        const currentElevatorFloorNumber = currentElevator.currentFloor();

                        // if elevator and currentElevator are on the same floor
                        // use elevator.loadFactor() and currentElevator.loadFactor
                        // and if that is the same then use elevator.id compare currentElevator.id
                        if (elevatorFloorNumber === currentElevatorFloorNumber) {
                            if (elevatorLoadFactor === currentElevatorLoadFactor) {
                                // arbitrarily determine proximity based on id
                                // this is just to make sure that elevator decides to go to this floor
                                return elevator.id < currentElevator.id;
                            }

                            // consider elevator closer if it is on the same floor and load factor is less than currentElevator
                            return (elevatorLoadFactor < currentElevatorLoadFactor);
                        }

                        // elevator and currentElevator are going the same direction but they are not on the same floor
                        // determine direction and then determine if elevator is closer
                        if (elevatorLastDestinationDirection === upIndicator && buttonPressed === upIndicator) {
                            return elevatorFloorNumber < currentFloorNumber;
                        } else if (elevatorLastDestinationDirection === downIndicator && buttonPressed === downIndicator) {
                            return elevatorFloorNumber > currentFloorNumber;
                        } else {
                            //  if elevatorLastDestinationDirection && currentElevatorLastDestinationDirection
                            // are both not equal to up or down then assume they are starting at the bottom

                            return elevatorFloorNumber < currentFloorNumber;
                        }
                    } else {
                        //  if elevator and current elevator are not going the same direction

                        const elevatorDistanceFromCurrentFloor = numberDifference(
                            elevatorFloorNumber,
                            currentFloorNumber
                        );
                        const currentElevatorDistanceFromCurrentFloor = numberDifference(
                            currentElevatorFloorNumber,
                            currentFloorNumber
                        );

                        const currentElevatorIsCloserToCurrentFloor = (
                            currentElevatorDistanceFromCurrentFloor < elevatorDistanceFromCurrentFloor
                        );

                        // if NOT (current elevator is closer going the wrong direction and has no stops)
                            // AND if elevator destination direction is up and its floor number is less than (or equal to ?) currentFloorNumber
                                // in order to do equal to we would have to return an identifier to go to that floor first
                                // because I don't think that a button would be pressed on that floor if the elevator
                                // was stopped or idle. The rider would probably just get on. However, if the elevator is
                                // passing the current floor we would have to set it to go to first, but somehow do that
                                // only for the return true option since that is how we assign the current floor.
                            // TODO maybe: and if currentElevator has fewer remaining stops
                        if (!(currentElevatorIsCloserToCurrentFloor && currentElevator.destinationQueue.length === 0)) {
                            if (elevatorLastDestinationDirection === upIndicator
                                && elevatorFloorNumber < currentFloorNumber) {
                                // elevator is closer
                                return true;
                            } else if (elevatorLastDestinationDirection === downIndicator
                                && elevatorFloorNumber > currentFloorNumber) {
                                // elevator is closer
                                return true;
                            }
                        }
                    }

                    // if no conditions were met the current iterated elevator is not closer
                    return false;
                });

                // if this is not based this off of direction
                // An elevator with fewer stops than currentElevator will be assigned the currentFloor
                // However, that may not be entirely desirable if that elevator has to cover more distance
                // with fewer stops, because in that case currentElevator could have made it to the current
                // floor faster than an elevator that would be assigned current floor.
                const allOtherElevatorsWithFewerStops = allOtherElevators.filter((elevator) => {
                    return elevator.destinationQueue.length < currentElevator.destinationQueue.length;
                });

                if (currentElevator.loadFactor() < fullLoadFactorIndicator
                    && allOtherElevatorsGoingToCurrentFloor.length === 0
                    && allOtherCloserElevators.length === 0
                    // I think the allOtherCloserElevators is doing some of the fewer stops logic
                    // temporarily disable this check to see if it makes a difference
                    // && allOtherElevatorsWithFewerStops.length === 0
                   ) {
                    // current elevator should go to current floor
                    return true;
                }
                // current elevator should not go to current floor;
                return false;
            }

            function elevatorDestinationQueue(elevator, id) {
                if (elevator.id === id) {
                    const destinationQueue = elevator.destinationQueue;
                    debugger;
                }
            }

            //
            // for each elevator add listeners for every floor
            //
            floors.forEach(function (floor) {
                const floorNumber = floor.floorNum();

                floor.on('up_button_pressed', function() {
                    console.log(`up button pressed on floor ${floorNumber}`);
                    const buttonPressed = 'up';
                    if (shouldGoToFloor(buttonPressed, floorNumber, elevator, elevatorsWithIdsAndDirection)) {
                        elevatorDestinationQueue(elevator, 0);
                        elevator.goToFloor(floorNumber);
                    }
                });

                floor.on('down_button_pressed', function() {
                    console.log(`down button pressed on floor ${floorNumber}`);
                    const buttonPressed = 'down';
                    if (shouldGoToFloor(buttonPressed, floorNumber, elevator, elevatorsWithIdsAndDirection)) {
                        elevatorDestinationQueue(elevator, 0);
                        elevator.goToFloor(floorNumber);
                    }
                });
            });

            elevator.on('floor_button_pressed', function(floorPressed) {
                elevatorDestinationQueue(elevator, 0);
                console.log(`floor button pressed for floor ${floorPressed}`);
                elevator.goToFloor(floorPressed);
            });

            elevator.on('idle', () => {
                const currentFloorNumber = elevator.currentFloor();
                elevatorDestinationQueue(elevator, 0);
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
                        elevatorDestinationQueue(elevator, 0);
                        elevator.goToFloor(nextFloor, true);
                    }

                    // change the direction if someone is waiting for the elevator on the current floor and there are no remaining
                    // destinations in the current direction
                    if (Array.isArray(remainingFloors) && remainingFloors.length === 0) {
                        const buttonStates = floors[currentFloorNumber].buttonStates;
                        if (lastDestinationDirection === 'up'
                            && buttonStates[lastDestinationDirection] !== activeButtonState
                            && buttonStates['down'] === activeButtonState
                           ) {
                            elevatorDestinationQueue(elevator, 0);
                            elevator.lastDestinationDirection = 'down';
                            setDirectionIndicator(currentFloorNumber, elevator.lastDestinationDirection);
                        }

                        if (lastDestinationDirection === 'down'
                            && buttonStates[lastDestinationDirection] !== activeButtonState
                            && buttonStates['up'] === activeButtonState
                           ) {
                            elevatorDestinationQueue(elevator, 0);
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
                elevatorDestinationQueue(elevator, 0);
                // go to current floor first if it is in pressed floors array
                // or got to current floor has activated button of the direction the elevator is currently going
                if ((Array.isArray(pressedFloors) && pressedFloors.includes(currentFloorNumber))
                    || (buttonStates[elevator.lastDestinationDirection] === activeButtonState)
                   ) {
                    elevatorDestinationQueue(elevator, 0);
                    elevator.goToFloor(currentFloorNumber, true);
                }
            });
        });
    },
    update (dt, elevators, floors) {
        // We normally don't need to do anything here
    }
};