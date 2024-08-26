import Plan from "../Plan.js";
import client from "../client.js";
import { astar, Graph } from '../astar.js';
import Msg from "../Msg.js";

class GotoA extends Plan {

    isApplicableTo(desire) {
        return desire == 'go_to_astar';
    }

    async execute(intentionRevision, father_desire, { x, y }, grid, me) {

        // In this function a path is found using the A* algorithm and than the 
        // agent start executing the movement

        const graph = new Graph(grid.getMap());
        const start = graph.grid[Math.floor(me.x)][Math.floor(me.y)];
        const end = graph.grid[x][y];
        const result = astar.search(graph, start, end);
        me.currentPath = result;

        let time_before = Date.now();

        for (let i = 0; i < result.length; i++) {


            // since the movement duration is not the same that is given by the config 
            // calculate the effective movement duration in order to use it in the utility function
            if (i > 0) {
                let movementDuration = Date.now() - time_before;
                me.movementDuration = (me.movementDuration + movementDuration) / 2;
            }
            time_before = Date.now();

            // Intention revision
            if (father_desire === "go_put_down" || father_desire === "go_pick_up" || father_desire === "random_move" ) {
                const best = intentionRevision.select_best_intention()
                if (best.get_predicate() !== father_desire) {
                    throw ['FIND ANOTHER INTENTION ', x, y];
                }
                else if (father_desire === "go_pick_up") {
                    const best_position = { x: best.get_args()[0].x, y: best.get_args()[0].y }
                    if (best_position.x != end.x || best_position.y != end.y) {
                        throw ['FIND ANOTHER INTENTION ', best.get_predicate(),best.get_args()[0]];
                    }
                }
                if(father_desire === "go_put_down"){
                    if(me.number_of_parcels_carried === 0){
                        throw ['STOP PUT DOWN', x, y];
                    }
                }
            }

            x = result[i].x;
            y = result[i].y;
            let status_x = undefined;
            let status_y = undefined;

            // movement part
            if (x > me.x)
                status_x = await client.move('right')
            else if (x < me.x)
                status_x = await client.move('left')

            if (status_x) {
                me.x = status_x.x;
                me.y = status_x.y;
            }

            if (y > me.y)
                status_y = await client.move('up')
            else if (y < me.y)
                status_y = await client.move('down')

            if (status_y) {
                me.x = status_y.x;
                me.y = status_y.y;
            }

            // if stucked compute the possible options
            if (!status_x && !status_y) {
                const agentMap = grid.getAgentMap()
                for (const agent of agentMap) {
                    if (agent.x == x && agent.y == y ) {
                        console.log('stucked with agent', agent.id);
                        // Coop with my friend in order to unstuck
                        if (agent.id === me.friendId && me.name === "slave" && !me.stuckedFriend ) {
                            me.stuckedFriend = true
                            console.log('stucked with my Friend');
                            let msg = new Msg();
                            msg.setHeader("STUCKED_TOGETHER");
                            const content = { direction: grid.getPossibleDirection(me.x, me.y), path: result, reachablePoint: grid.getReachablePoints(me.x, me.y) }
                            msg.setContent(content);
                            await client.say(me.friendId, msg);
                            break;
                        }
                        break;
                    }
                }

                throw ['stucked', x, y];
            } else {
                // Send current position to agent
                if (me.friendId) {
                    let msg = new Msg();
                    msg.setHeader("CURRENT_POSITION");
                    msg.setContent({ x: me.x, y: me.y });
                    client.say(me.friendId, msg);
                }
            }
            // If some parcels are in the way, pick them up
            await client.pickup();

        }

        if (father_desire === "priority_action") {
            let msg = new Msg();
            msg.setHeader("STUCK_RESOLVED");
            client.say(me.friendId, msg);
        }else if(father_desire === "MOVE_OUT_OF_MY_PATH-priority_action"){
            // notify our friend that we have complete the action in order to move our self out of his path, so he can move
            me.stuckedFriend = true;
            let msg = new Msg();
            msg.setHeader("STUCK_RESOLVED");
            client.say(me.friendId, msg);
            
        }
    }



}

export default GotoA;