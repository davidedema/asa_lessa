import Plan from "../Plan.js";
import client from "../client.js";
import { astar, Graph } from '../astar.js';

class GotoAComm extends Plan {

    isApplicableTo(desire) {
        return desire == 'go_to_comm';
    }

    async execute({ x, y }, grid, me) {

        const graph = new Graph(grid.getMap());
        const start = graph.grid[Math.floor(me.x)][Math.floor(me.y)];
        const end = graph.grid[x][y];

        const planner = new PDDLPlanner(grid, start, end);
        const problem = await planner.getProblem();
        const domain =fs.readFileSync('/home/davide/Desktop/asa_lessa/BDIAgent/PDDL/domain.pddl', 'utf8').replace(/\r?\n|\r/g, '').replace(/\s\s+/g, ' ');

        console.log("Sending to remote planner");

        var plan = await onlineSolver(domain, problem);

        if ( plan ) {
            for (let i = 0; i < plan.length; i++) {

                let action = plan[i];
                let status = undefined;
                // TODO magari cambiare nome azioni nel dominio pddl così da non dover fare questo switch
                if (action.action == 'MOVE_UP') {
                    status = await client.move('up');
                }

                if (action.action == 'MOVE_DOWN') {
                    status = await client.move('down');
                }

                if (action.action == 'MOVE_LEFT') {
                    status = await client.move('left');
                }

                if (action.action == 'MOVE_RIGHT') {
                    status = await client.move('right');
                }

                if (status) {
                    me.x = status.x;
                    me.y = status.y;
                }
                else {
                    throw ['stucked'];
                }
            }
        }

    }

}

export default GotoAComm;