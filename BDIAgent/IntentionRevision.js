import Intention from "./Intention.js";
import client from "./client.js";
import Msg from "./Msg.js";
import { astar, Graph } from './astar.js';
import configPromise from './config.js';
import { computeManhattanDistance } from "./utils.js";

let config;
configPromise.then((conf) => {
    config = conf;
});

class IntentionRevisionAgent {
    #grid;
    #me;
    #running;
    #parcel_taken = new Array();

    get parcel_taken(){
        return this.#parcel_taken;
    }

    set parcel_taken(value){
        this.#parcel_taken = value;
    }

    set running(value) {
        this.#running = value
    }

    get running() {
        return this.#running;
    }

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

    #parcels_picked_up_by_friend = new Array();

    get parcels_picked_up_by_friend() {
        return this.#parcels_picked_up_by_friend;
    }

    set parcels_picked_up_by_friend(value) {
        this.#parcels_picked_up_by_friend = value;
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

        if (isNaN(this.me.pointLossInOneSecond)) {
            // if the pointLossInOneSecond is NaN(so the reward dose not decay) the agent can be stuck in a infinite pickup 
            // in order to avoid it when it has reached 10 parcels go to put down it 
            if (this.me.number_of_parcels_carried > 10) {
                return go_put_down_intention
            }
        }
        // Sort intentions by priority
        let ordered_intentions = new Array();

        for (let intention of this.intention_queue) {
            if (intention.predicate === 'go_pick_up') {
                if (this.parcels_picked_up_by_friend.includes(intention.get_args()[0].id) || this.parcel_taken.includes(intention.get_args()[0].id)) {
                    this.remove(intention.get_args()[0]);
                }
            }
        }

        // Check if the parcel is still there and if the reward is still valid
        const go_pick_up_intentions = this.intention_queue.filter(intention => {

            if (intention.started) {
                return false
            }

            if (intention.predicate === 'go_pick_up') {

                if (this.me.friendId) {
                    if (this.me.friendIntention && this.me.friendPosition) {
                        // considering the intention of my friend I compute the distance between 
                        if (this.me.friendIntention.predicate === 'go_pick_up' && this.me.friendIntention.args[0].id === intention.get_args()[0].id) {
                            const graph = new Graph(this.#grid.getMap());
                            let start = graph.grid[Math.floor(this.me.x)][Math.floor(this.me.y)];
                            const end = graph.grid[intention.get_args()[0].x][intention.get_args()[0].y];
                            const myDistance = astar.search(graph, start, end).length;
                            start = graph.grid[Math.floor(this.me.friendPosition.x)][Math.floor(this.me.friendPosition.y)];
                            const friendDistance = astar.search(graph, start, end).length;
                            if (friendDistance < myDistance) {
                                return false;
                            }
                        }
                    }
                }

                let time_now = Date.now();
                let parcel = intention.get_args()[0];
                const stepInOneSecond = 1000 / this.me.movementDuration;
                // valid parcel
                // get the current reward, becasue the reward saved inside the parcel is the reward that there was when the parcel was seen
                // now the reward it's decayed so we need to calculate the actual reward
                let reward
                // if there is a pointLossInOneSecond calculate how much is the actual reward of the parcels
                if (isNaN(this.me.pointLossInOneSecond)) {
                    reward = parcel.reward
                } else {
                    reward = Math.floor(parcel.reward - (((time_now - parcel.time) / 1000) * this.me.pointLossInOneSecond ));
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
                const utilityA = a.get_utility(this.me.number_of_parcels_carried, this.me.movementDuration)['utility'];
                const utilityB = b.get_utility(this.me.number_of_parcels_carried, this.me.movementDuration)['utility'];
                return utilityB - utilityA;
            });
            const best_intention = ordered_intentions[0];

            if (best_intention.get_utility(this.me.number_of_parcels_carried, this.me.movementDuration)['utility'] > 0) {
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

        if (this.running) {
            return;
        }

        // flag that indicates that the agent is running, and avoid that the loop starts two times
        this.running = true;
        while (true) {

            if (this.#me.stuckedFriend) {
                this.running = false;
                break;
            }

            let intention;
            let priority_intention = false;

            if (this.#priority_queue.length > 0) {
                intention = this.#priority_queue[0];
                priority_intention = true;
                console.log("PRIORITY INTENTION", intention.predicate)

            } else {
                // Consumes intention_queue if not empty
                intention = this.select_best_intention();
            }

            if (intention) {
                if (intention.predicate === 'go_pick_up') {
                    if(this.parcel_taken.includes(intention.get_args()[0].id)){
                        continue;
                    }
                    console.log("INTENTION", intention.predicate, intention.get_args()[0].id, "x-y:", intention.get_args()[0].x, "-", intention.get_args()[0].y)
                } else {
                    console.log("INTENTION", intention.predicate)
                }

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
                        if (intention.predicate === 'go_pick_up') {
                            console.log("Stopped intention:", intention.predicate, intention.get_args()[0].id, "x-y:", intention.get_args()[0].x, "-", intention.get_args()[0].y)
                        }
                    }).finally(() => {
                        // if the intention was completed without stopping it, remove it from the intention queue, notify our friend 
                        if (!intention.stopped) {

                            // Remove intention from queue
                            if (!priority_intention) {
                                this.intention_queue = this.intention_queue.filter(i => i.get_args()[0].id !== intention.get_args()[0].id);
                            } else {
                                this.#priority_queue = this.#priority_queue.filter(i => i.get_args()[0].id !== intention.get_args()[0].id);
                            }
                            // If we have picked up a parcel, we can notify to the friend agent
                            if (intention.predicate === 'go_pick_up') {
                                this.parcel_taken.push(intention.get_args()[0].id);
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
                        }
                        // if the intention has been stopped we don't want to remove it from the queue
                        // reset the initial state of the intention
                        intention.stopped = false;
                        intention.started = false;
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
        let father_desire = "priority_action"
        if (predicate === "MOVE_OUT_OF_MY_PATH") {
            predicate = "go_to_astar"
            father_desire = "MOVE_OUT_OF_MY_PATH-priority_action"
        }
        this.priority_queue.push(new Intention(this, father_desire, predicate, ...args));
    }

    async push(predicate, ...args) {
        let father_desire = "";
        if (predicate === "go_to_astar") {
            father_desire = "SPLIT"
        }
        const intention = new Intention(this, father_desire, predicate, ...args);
        this.intention_queue.push(intention);

    }
    // method used in order to avoid an intention of pick up, is used when a friend say that he has already picked up that parcel
    async erase(intention) {
        this.parcels_picked_up_by_friend.push(intention.args[0].id);

    }

}

export default IntentionRevisionRevise;