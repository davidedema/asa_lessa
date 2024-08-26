import Plan from "../Plan.js";
import client from "../client.js";
import { Graph } from '../astar.js';
import { onlineSolver } from "@unitn-asa/pddl-client";
import { PDDLPlanner } from "../PDDL/pddlPlanner.js";
import fs from 'fs';

class PDDLMove extends Plan {

    isApplicableTo(desire) {
        return desire == 'pdll_move';
    }

    async execute(intentionRevision, father_desire, { x, y }, grid, me) {
        const graph = new Graph(grid.getMap());
        const start = graph.grid[Math.floor(me.x)][Math.floor(me.y)];
        const end = graph.grid[x][y];

        // Build the PDDL problem and read the domain
        const planner = new PDDLPlanner(grid, start, end);
        const problem = await planner.getProblem();
        const domain =fs.readFileSync('/home/davide/Desktop/asa_lessa/BDIAgent/PDDL/domain.pddl', 'utf8').replace(/\r?\n|\r/g, '').replace(/\s\s+/g, ' ');

        console.log("Sending to remote planner");
        
        // Get the plan by the online solver 
        var plan = await onlineSolver(domain, problem);

        // Intention revision
        const best = intentionRevision.select_best_intention()
        if (best.get_predicate() != father_desire && father_desire == 'go_put_down') {
            throw ['FIND ANOTHER INTENTION ', x, y];
        }else if(father_desire == 'go_pick_up'){
            const best_position = { x: best.get_args()[0].x, y: best.get_args()[0].y }
            if (best_position.x != end.x || best_position.y != end.y) {
                throw ['FIND ANOTHER INTENTION ', x, y];
            }
        }

        // Execute the plan
        if ( plan ) {
            for (let i = 0; i < plan.length; i++) {

                let action = plan[i];
                let status = undefined;
                
                status = await client.move(action.action.toLowerCase());

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