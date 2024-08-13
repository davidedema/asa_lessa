import Intention from "./Intention.js";
import client from "./client.js";
import Msg from "./Msg.js";
import { astar, Graph } from './astar.js';

const computeManhattanDistance = (start, end) => {
    return Math.abs(start.x - end.x) + Math.abs(start.y - end.y);
}

class IntentionRevisionAgent {

    #intention_queue = new Array();
    get intention_queue() {
        return this.#intention_queue;
    }

    set intention_queue(value) {
        this.#intention_queue = value;
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

        // Sort intentions by priority
        let ordered_intentions = new Array();

        if (this.intention_queue.length == 0) {
            return new Intention(this, "", 'random_move');
        }
        const go_put_down_intentions = this.intention_queue.filter(intention => intention.predicate === 'go_put_down');
        if (go_put_down_intentions.length > 0) {
            var go_put_down_intention = go_put_down_intentions[0];
        }
        else {
            var go_put_down_intention = undefined;
        }
        // const go_pick_up_intentions = this.intention_queue.filter(intention => intention.predicate === 'go_pick_up');

        const me = this.intention_queue[0].get_args()[2];


        // Check if the parcel is still there and if the reward is still valid
        const go_pick_up_intentions = this.intention_queue.filter(intention => {
            if (intention.predicate === 'go_pick_up') {
                let time_now = Date.now();
                let parcel = intention.get_args()[0];
                // NON FUNZIONA SE DECAY E' 0
                if (me.decay === 0) {
                    if (parcel.time + parcel.reward < time_now) {
                        // parcel expired
                        return false;
                    }
                } else if (parcel.time + parcel.reward * me.decay * 1000 < time_now) {
                    // parcel expired
                    return false;
                }

                // TODO sicuro si può migliorare questa parte
                // valid parcel
                // get the current reward
                let reward = Math.floor((parcel.time + parcel.reward * 1000 - time_now) / 1000);
                parcel.reward = reward;
                // for now we are not interested
                if (reward <= 3) {
                    return false;
                }
                // distance from the parcel
                let distance = computeManhattanDistance({ x: me.x, y: me.y }, parcel);

                // if the distance is too far we are not interested
                // distance / 2 cause we move at 2 cells per second
                if ((distance / 2) > reward) {
                    return false;
                }
                return true;
            }
            return false;
        });

        if (go_pick_up_intentions.length > 0) {
            // Sort intentions by utility
            ordered_intentions = go_pick_up_intentions.sort((a, b) => {
                const utilityA = a.get_utility(me.number_of_parcels_carried)['utility'];
                const utilityB = b.get_utility(me.number_of_parcels_carried)['utility'];
                return utilityB - utilityA;
            });
            const best_intention = ordered_intentions[0];
            // console.log('best_intention', best_intention.get_predicate(), best_intention.get_args()[0]);


            if (best_intention.get_utility(me.number_of_parcels_carried)['utility'] > 0) {
                // this.intention_queue = this.intention_queue.filter(intention => intention !== best_intention);
                return best_intention;
            } else if (me.number_of_parcels_carried > 0) {
                // this.intention_queue = this.intention_queue.filter(intention => intention !== go_put_down_intention);
                return go_put_down_intention;
            } else {
                return new Intention(this, "", 'random_move');
            }
        } else if (me.number_of_parcels_carried > 0) {
            // this.intention_queue = this.intention_queue.filter(intention => intention !== go_put_down_intention);
            return go_put_down_intention;
        } else {
            return new Intention(this, "", 'random_move');
        }
    }

    async loop() {
        while (true) {

            // Consumes intention_queue if not empty
            const intention = this.select_best_intention();


            if (intention) {
                console.log("intention selected", intention.get_predicate());
                let msg = new Msg();
                msg.setHeader("CURRENT_INTENTION");
                const content = {
                    predicate: intention.predicate,
                    args: intention.get_args()
                }
                msg.setContent(content);
                client.shout(msg);

                // Start achieving intention
                await intention.achieve()
                    // Catch eventual error and continue
                    .catch(error => {
                        intention.stop();
                        // console.log('Failed intention', intention.predicate, 'with error:', error)
                    }).finally(() => {
                        // Remove intention from queue
                        this.intention_queue = this.intention_queue.filter(i => i !== intention);
                        let msg = new Msg();
                        msg.setHeader("COMPLETED_INTENTION");
                        const content = {
                            predicate: intention.predicate,
                            args: intention.get_args()
                        }
                        msg.setContent(content);
                        client.shout(msg);
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

class IntentionRevisionReplaceAgent extends IntentionRevisionAgent {

    async push(predicate, ...args) {

        let last = undefined;
        // Check if already queued
        if (this.intention_queue.length - 1 >= 0) {
            last = this.intention_queue[this.intention_queue.length - 1];
            if (last && last.predicate == predicate) {
                return; // intention is already being achieved
            }
        }

        console.log('IntentionRevisionReplace.push', predicate);
        const intention = new Intention(this, predicate, ...args);
        this.intention_queue.push(intention);

    }

    async erase(intention) {
        this.intention_queue = this.intention_queue.filter(i => i !== intention);
    }

}


class IntentionRevisionRevise extends IntentionRevisionAgent {

    async push(predicate, ...args) {
        // console.log('Revising intention queue. Received', predicate);
        let father_desire = "";
        if (predicate === "go_to_astar") {
            father_desire = "SPLIT"
        }
        const intention = new Intention(this, father_desire, predicate, ...args);
        this.intention_queue.push(intention);

    }

}

export default IntentionRevisionRevise;