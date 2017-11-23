{
    init: function(elevators, floors) {
        elevators.forEach(function (elevator) {
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
                const destinationQueue = elevator.destinationQueue;
                console.log(`passing floor number ${currentFloorNumber} and the current direction is ${direction}`);

                // go to current floor first if it is in pressed floors array
                if (Array.isArray(pressedFloors) && pressedFloors.includes(currentFloorNumber)) {
                    elevator.goToFloor(currentFloorNumber, true);
                    debugger;
                }
            });
        });
    },
    update: function(dt, elevators, floors) {
        // We normally don't need to do anything here
    }
}