import Intention from "./Intention.js";
import client from "./client.js";
import Msg from "./Msg.js";
import { astar, Graph } from './astar.js';
import configPromise from './config.js';

let config;
configPromise.then((conf) => {
    config = conf;
});

const computeManhattanDistance = (start, end) => {
    return Math.abs(start.x - end.x) + Math.abs(start.y - end.y);
}

class IntentionRevisionAgent {
    #grid;
    #me;

    constructor(grid, me) {
        this.#grid = grid
        this.#me = me
    }

    set grid(value) {
        this.#grid = value;
    }

    get grid() {
        return this.#grid;
    }

    set me(value) {
        this.#me = value;
    }

    get me() {
        return this.#me;
    }

    #intention_queue = new Array();
    get intention_queue() {
        return this.#intention_queue;
    }

    set intention_queue(value) {
        this.#intention_queue = value;
    }

    #priority_queue = new Array();

    get priority_queue() {
        return this.#priority_queue;
    }

    set priority_queue(value) {
        this.#priority_queue = value;
    }

    get_parcerls_to_pickup() {

        const parcels = new Array();

        for (let intention of this.intention_queue) {
            if (intention.predicate == 'go_pick_up') {
                const args = intention.get_args();
                if (args[0] && args[0].id) {
                    parcels.push(args[0].id);
                }
            }
        }
        return parcels
    }

    remove(parcel) {
        this.intention_queue = this.intention_queue.filter(intention => {
            if (intention.predicate == 'go_pick_up') {
                const args = intention.get_args();
                if (args[0] && args[0].id) {
                    return args[0].id !== parcel.id;
                }
            }
        });
    }

    select_best_intention() {

        const split_move = this.intention_queue.filter(intention => intention.predicate === 'go_to_astar');
        if (split_move.length > 0) {
            console.log("SPLIT MOVE")
            split_move[0].print()
            return split_move[0];
        }

        if (this.intention_queue.length == 0) {
            if (this.me.number_of_parcels_carried > 0) {
                return new Intention(this, "", 'go_put_down', this.grid, this.grid.getDeliverPoints(), this.me);;
            }
            return new Intention(this, "", 'random_move', this.grid, this.me);
        }

        const go_put_down_intention = new Intention(this, "", 'go_put_down', this.grid, this.grid.getDeliverPoints(), this.me);
        // Sort intentions by priority
        let ordered_intentions = new Array();

        // Check if the parcel is still there and if the reward is still valid
        const go_pick_up_intentions = this.intention_queue.filter(intention => {
            if (intention.predicate === 'go_pick_up') {

                if (this.me.friendId) {
                    if (this.me.friendIntention) {
                        if (this.me.friendIntention.predicate === 'go_pick_up' && this.me.friendIntention.args[0].id === intention.get_args()[0].id) {
                            const graph = new Graph(this.#grid.getMap());
                            let start = graph.grid[Math.floor(this.me.x)][Math.floor(this.me.y)];
                            const end = graph.grid[intention.get_args()[0].x][intention.get_args()[0].y];
                            const myDistance = astar.search(graph, start, end).length;
                            start = graph.grid[Math.floor(this.me.friendIntention.args[2].x)][Math.floor(this.me.friendIntention.args[2].y)];
                            const friendDistance = astar.search(graph, start, end).length;
                            if (friendDistance < myDistance) {
                                console.log("NOT CONSIDERING", intention.get_args()[0].id)
                                return false;
                            }else{
                                console.log("CONSIDERING I'M NEAR")
                            }

                        }
                    }
                }

                let time_now = Date.now();
                let parcel = intention.get_args()[0];
                // TODO sicuro si può migliorare questa parte
                // valid parcel
                // get the current reward
                let reward
                // if there is a decay calculate how much is the actual reward of the parcels
                if (this.me.decay !== 0) {
                    reward = Math.floor(parcel.reward - (((time_now - parcel.time) / 1000) * 1 / this.me.decay));
                } else {
                    reward = parcel.reward
                }
                // for now we are not interested since we don't gain any point
                if (reward <= 3) {
                    return false;
                }
                // distance from the parcel
                let distance = computeManhattanDistance({ x: this.me.x, y: this.me.y }, parcel);

                // if the distance is too far we are not interested
                // distance / 2 cause we move at 2 cells per second
                const agentSpeed = parseFloat(config['RANDOM_AGENT_SPEED'].slice(0, -1))
                if ((distance / agentSpeed) > reward) {
                    return false;
                }
                return true;
            }
            return false;
        });

        if (go_pick_up_intentions.length > 0) {
            // Sort intentions by utility
            ordered_intentions = go_pick_up_intentions.sort((a, b) => {
                const utilityA = a.get_utility(this.me.number_of_parcels_carried)['utility'];
                const utilityB = b.get_utility(this.me.number_of_parcels_carried)['utility'];
                return utilityB - utilityA;
            });
            const best_intention = ordered_intentions[0];

            if (best_intention.get_utility(this.me.number_of_parcels_carried)['utility'] > 0) {
                return best_intention;
            } else if (this.me.number_of_parcels_carried > 0) {
                return go_put_down_intention;
            } else {
                return new Intention(this, "", 'random_move', this.grid, this.me);
            }
        } else if (this.me.number_of_parcels_carried > 0) {
            return go_put_down_intention;
        } else {
            return new Intention(this, "", 'random_move', this.grid, this.me);
        }
    }

    async loop() {
        let streak_stucked = 0;
        while (true) {
            if(streak_stucked > 10){
                streak_stucked = 0 ;
                this.#me.stuckedFriend = false;
            }

            if (this.#me.stuckedFriend) { 
                new Promise(resolve => setTimeout(resolve, 1000));
                streak_stucked++;
                continue;

            }

            let intention;
            let priority_intention = false;

            if (this.#priority_queue.length > 0) {
                intention = this.#priority_queue[0];
                priority_intention = true;

            } else {
                // Consumes intention_queue if not empty
                intention = this.select_best_intention();
            }

            if (intention) {
                console.log("INTENTION", intention.predicate)
                if (this.#me.friendId) {
                    if (intention.predicate !== 'random_move') {
                        let msg = new Msg();
                        msg.setHeader("CURRENT_INTENTION");
                        const content = {
                            predicate: intention.predicate,
                            args: intention.get_args()
                        }
                        msg.setContent(content);
                        client.say(this.#me.friendId, msg);
                    }
                }
                this.#me.setCurrentIntention(intention);
                // Start achieving intention
                await intention.achieve()
                    // Catch eventual error and continue
                    .catch(error => {
                        intention.stop();
                        // console.log('Failed intention', intention.predicate, 'with error:', error)
                    }).finally(() => {
                        // Remove intention from queue
                        if (!priority_intention) {
                            this.intention_queue = this.intention_queue.filter(i => i !== intention);
                        } else {
                            this.#priority_queue = this.#priority_queue.filter(i => i !== intention);
                        }
                        // If we have picked up a parcel, we can notify to the friend agent
                        if (intention.predicate === 'go_pick_up') {
                            if (this.#me.friendId) {
                                let msg = new Msg();
                                msg.setHeader("COMPLETED_INTENTION");
                                const content = {
                                    predicate: intention.predicate,
                                    args: intention.get_args()
                                }
                                msg.setContent(content);
                                client.say(this.#me.friendId, msg);
                            }
                        }
                    });
            }
            // Postpone next iteration at setImmediate
            await new Promise(res => setImmediate(res));
        }
    }

    log(...args) {
        console.log(...args)
    }

}

class IntentionRevisionRevise extends IntentionRevisionAgent {

    async push_priority_action(predicate, ...args) {
        let father_desire = "";
        if (predicate === "go_to_astar") {
            father_desire = "SPLIT"
        }
        this.priority_queue.push(new Intention(this, "priority_action", predicate, ...args));
    }

    async push(predicate, ...args) {
        let father_desire = "";
        if (predicate === "go_to_astar") {
            father_desire = "SPLIT"
        }
        const intention = new Intention(this, father_desire, predicate, ...args);
        this.intention_queue.push(intention);

    }
    // method used in order to erase an intention of pick up, is used when a friend say that he has already picked up that parcel
    async erase(intention) {
        this.intention_queue = this.intention_queue.filter(i => {

            if (intention.predicate !== 'go_pick_up') {
                return true;
            } else {
                if (intention.args[0].id !== i.get_args()[0].id) {
                    return true;
                } else {
                    console.log("ERASED INTENTION", intention.args[0].id)
                    return false;
                }
            }
        }
        );
    }

}

export default IntentionRevisionRevise;