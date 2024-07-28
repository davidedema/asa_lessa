import Plan from "../Plan.js";
import client from "../client.js";
import { astar, Graph } from '../astar.js';

class PDDLMove extends Plan {

    static isApplicableTo(desire) {
        return desire == 'pdll_move';
    }

    async execute(intentionRevision, father_desire,{ x, y }, grid, me) {
        const graph = new Graph(grid.getMap());
        const start = graph.grid[Math.floor(me.x)][Math.floor(me.y)];
        const end = graph.grid[x][y];
        const result = astar.search(graph, start, end);

        
    }


}