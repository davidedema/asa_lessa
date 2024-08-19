import Plan from "../Plan.js";
import client from "../client.js";
import { astar, Graph } from '../astar.js';
import Msg from "../Msg.js";

class GotoA extends Plan {

    isApplicableTo(desire) {
        return desire == 'go_to_astar';
    }

    async execute(intentionRevision, father_desire,{ x, y }, grid, me) {

        const graph = new Graph(grid.getMap());
        const start = graph.grid[Math.floor(me.x)][Math.floor(me.y)];
        const end = graph.grid[x][y];
        const result = astar.search(graph, start, end);

        for (let i = 0; i < result.length; i++) {
            if(father_desire !== "SPLIT"){
                const best = intentionRevision.select_best_intention()
                if (best.get_predicate() !== father_desire ) {
                    throw ['FIND ANOTHER INTENTION ', x, y];
                }
                else if (father_desire === "go_pick_up") {
                    const best_position = { x: best.get_args()[0].x, y: best.get_args()[0].y }
                    if (best_position.x != end.x || best_position.y != end.y) {
                        throw ['FIND ANOTHER INTENTION ', x, y];
                    }
                }
                // if(me.friendId){
                //     let msg = new Msg();
                //     msg.setHeader("CURRENT_INTENTION");
                //     const content = {
                //         predicate: best.get_predicate(),
                //         args: best.get_args()
                //     }
                //     msg.setContent(content);
                //     client.say(me.friendId,msg);
                // }
            }

            x = result[i].x;
            y = result[i].y;
            let status_x = undefined;
            let status_y = undefined;


            if (x > me.x)
                status_x = await client.move('right')
            // status_x = await this.subIntention( 'go_to', {x: me.x+1, y: me.y} );
            else if (x < me.x)
                status_x = await client.move('left')
            // status_x = await this.subIntention( 'go_to', {x: me.x-1, y: me.y} );

            if (status_x) {
                me.x = status_x.x;
                me.y = status_x.y;
            }

            if (y > me.y)
                status_y = await client.move('up')
            // status_x = await this.subIntention( 'go_to', {x: me.x, y: me.y+1} );
            else if (y < me.y)
                status_y = await client.move('down')
            // status_x = await this.subIntention( 'go_to', {x: me.x, y: me.y-1} );

            if (status_y) {
                me.x = status_y.x;
                me.y = status_y.y;
            }

            if (!status_x && !status_y) {
                const agentMap = grid.getAgentMap()
                for (const agent of agentMap) {
                    if (agent.x == x && agent.y == y) {
                        console.log('stucked with agent', agent.id);
                        if (agent.id === me.friendId) {
                            me.stuckedFriend = true
                            console.log('stucked with my Friend');
                            let msg = new Msg();
                            msg.setHeader("STUCKED_TOGETHER");
                            msg.setContent(grid.getPossibleDirection(me.x, me.y));
                            await client.say(me.friendId, msg);
                            break;
                        }
                        break;
                    }
                }
                console.log('stucked');

                throw ['stucked', x, y];
            }

            // if some parcels are in the way, pick them up
            await client.pickup();
        }
    }



}

export default GotoA;