const config = {
    init (elevators, floors) {
        elevators.forEach(function (elevator) {
            let lastDestinationDirection;
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

                debugger;
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
                    debugger;
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

                debugger;
                return remainingFloors;
            }

            function setDestinationQueue(
                direction,
                destinationQueue,
                pressedFloors
            ) {
                return destinationQueue.filter((floorNumber) => {
                    const buttonStates = floors[floorNumber].buttonStates;

                    return (buttonStates[direction] === activeButtonState || pressedFloors.includes(floorNumber));
                });
            }

            //
            // for each elevator add listeners for every floor
            //
            floors.forEach(function (floor) {
                var floorNumber = floor.floorNum();

                floor.on('up_button_pressed', function() {
                    console.log(`up button pressed on floor ${floorNumber}`);
                    elevator.goToFloor(floorNumber);
                });

                floor.on('down_button_pressed', function() {
                    console.log(`down button pressed on floor ${floorNumber}`);
                    elevator.goToFloor(floorNumber);
                });
            });

            elevator.on('floor_button_pressed', function(floorPressed) {
                console.log(`floor button pressed for floor ${floorPressed}`);
                elevator.goToFloor(floorPressed);
            });

            elevator.on('idle', () => {
                const currentFloorNumber = elevator.currentFloor();
                console.log(`the elevator is idle on floor ${currentFloorNumber}`);
                lastDestinationDirection = setDirectionIndicator(currentFloorNumber, lastDestinationDirection);
                debugger;
            });

            elevator.on('stopped_at_floor', function (currentFloorNumber) {
                console.log(`stopped at floor number ${currentFloorNumber}`);
                lastDestinationDirection = setDirectionIndicator(currentFloorNumber, lastDestinationDirection);

                // filter any weirdness in the destination queue
                // such as floor numbers that are not associated with a pressed floor or active button pressed
                elevator.destinationQueue = setDestinationQueue(
                    lastDestinationDirection,
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
                            lastDestinationDirection = 'down';
                            setDirectionIndicator(currentFloorNumber, lastDestinationDirection)
                        }

                        if (lastDestinationDirection === 'down'
                            && buttonStates[lastDestinationDirection] !== activeButtonState
                            && buttonStates['up'] === activeButtonState
                        ) {
                            lastDestinationDirection = 'up';
                            setDirectionIndicator(currentFloorNumber, lastDestinationDirection)
                        }

                        debugger;
                    }
                }

                debugger;
            });

            elevator.on("passing_floor", function(currentFloorNumber, direction) {
                const pressedFloors = elevator.getPressedFloors();
                const buttonStates = floors[currentFloorNumber].buttonStates;
                console.log(`passing floor number ${currentFloorNumber} and the current direction is ${direction}`);

                // set the direction the elevator is traveling in so riders know not to get on if their destination is the opposite direction
                lastDestinationDirection = setDirectionIndicator(currentFloorNumber, direction);
                debugger;

                // go to current floor first if it is in pressed floors array
                // or got to current floor has activated button of the direction the elevator is currently going
                if ((Array.isArray(pressedFloors) && pressedFloors.includes(currentFloorNumber))
                    || (buttonStates[direction] === activeButtonState)
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