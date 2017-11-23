const config = {
    init (elevators, floors) {
        elevators.forEach(function (elevator) {
            let lastDestinationDirection;


            function getDirectionIndicator(currentFloorNumber, destinationDirection = undefined) {
                const floorNumbers = floors.map(function (floor) {
                    return floor.floorNum();
                });
                const topFloorNumber = Math.max(...floorNumbers);
                const bottomFloorNumber = Math.min(...floorNumbers);

                if (currentFloorNumber === bottomFloorNumber) {
                    debugger;
                    return 'up';
                } else if (currentFloorNumber === topFloorNumber) {
                    debugger;
                    return 'down';
                } else if (destinationDirection !== undefined) {
                    debugger;
                    return destinationDirection;
                }

                debugger;
                return undefined;
            }

            // attempt to set the destination direction up/down
            function setDirectionIndicator(currentFloorNumber, destinationDirection = undefined) {
                const theDestinationDirection = getDirectionIndicator(setDirectionIndicator, destinationDirection);

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
                    case 'stopped':
                        break;
                }
                debugger;
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

            elevator.on('stopped_at_floor', function (currentFloorNumber) {
                console.log(`stopped at floor number ${currentFloorNumber}`);
            });

            elevator.on("passing_floor", function(currentFloorNumber, direction) {
                const pressedFloors = elevator.getPressedFloors();
                const buttonStates = floors[currentFloorNumber].buttonStates;
                const activatedButtonState = 'activated';
                console.log(`passing floor number ${currentFloorNumber} and the current direction is ${direction}`);

                // set the direction the elevator is traveling in so riders know not to get on if their destination is the opposite direction
                setDirectionIndicator(currentFloorNumber, direction);

                // go to current floor first if it is in pressed floors array
                // or got to current floor has activated button of the direction the elevator is currently going
                if ((Array.isArray(pressedFloors) && pressedFloors.includes(currentFloorNumber))
                    || (buttonStates[direction] === activatedButtonState)
                   ) {
                    elevator.goToFloor(currentFloorNumber, true);
                    debugger;
                }

                debugger;
            });
        });
    },
    update (dt, elevators, floors) {
        // We normally don't need to do anything here
    }
};