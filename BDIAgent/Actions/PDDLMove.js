import Plan from "../Plan.js";
import client from "../client.js";
import { astar, Graph } from '../astar.js';
import { onlineSolver, PddlExecutor, PddlProblem, Beliefset } from "@unitn-asa/pddl-client";
import { PDDLPlanner } from "../PDDL/pddlPlanner.js";


class PDDLMove extends Plan {

    static isApplicableTo(desire) {
        return desire == 'pdll_move';
    }

    async execute(intentionRevision, father_desire,{ x, y }, grid, me) {
        const graph = new Graph(grid.getMap());
        const start = graph.grid[Math.floor(me.x)][Math.floor(me.y)];
        const end = graph.grid[x][y];

        const planner = new PDDLPlanner(grid, start, end);
        const problem = await planner.getProblem();
        const domain = await fs.readFileSync('./BDIAgent/PDDL/domain.pddl', 'utf8').replace(/\r?\n|\r/g, '').replace(/\s\s+/g, ' ');

        console.log("Sending to remote planner");

        const plan = await onlineSolver(domain, problem);

        if ( plan ) {
            for (let i = 0; i < plan.length; i++) {

                let action = plan[i];
                let status = undefined;
                // TODO magari cambiare nome azioni nel dominio pddl così da non dover fare questo switch
                if (action.action == 'move_up') {
                    status = await client.move('up');
                }

                if (action.action == 'move_down') {
                    status = await client.move('down');
                }

                if (action.action == 'move_left') {
                    status = await client.move('left');
                }

                if (action.action == 'move_right') {
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

export default PDDLMove;