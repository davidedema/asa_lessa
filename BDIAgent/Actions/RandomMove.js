import Plan from "../Plan.js";
import client from "../client.js";
import { astar, Graph } from "../astar.js";

class RandomMove extends Plan {

    isApplicableTo(desire) {
        return desire == 'random_move';
    }

    async execute() {
        const directions = ['up', 'down', 'left', 'right'];
        // check possible options
        const direction = directions[Math.floor(Math.random() * directions.length)];
        await client.move(direction);
    }

}

export default RandomMove;