import Intention from "./Intention.js";
import client from "./client.js";

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
        // Sort intentions by priority
        let ordered_intentions = new Array();

        if (this.intention_queue.length == 0) {
            return new Intention(this, 'random_move');
        }

        const go_put_down_intention = this.intention_queue.filter(intention => intention.predicate !== 'go_pick_up')[0];
        const go_pick_up_intentions = this.intention_queue.filter(intention => intention.predicate === 'go_pick_up');

        const me = this.intention_queue[0].get_args()[2];

        if (go_pick_up_intentions.length > 0) {
            // Sort intentions by utility
            ordered_intentions = go_pick_up_intentions.sort((a, b) => {
                const utilityA = a.get_utility(me.number_of_parcels_carried)['utility'];
                const utilityB = b.get_utility(me.number_of_parcels_carried)['utility'];
                return utilityB - utilityA;
            });
            const best_intention = ordered_intentions[0];
            console.log('best_intention', best_intention);


            if (best_intention.get_utility(me.number_of_parcels_carried)['utility'] > 0) {
                this.intention_queue = this.intention_queue.filter(intention => intention !== best_intention);
                return best_intention;
            } else if (me.number_of_parcels_carried > 0) {
                return go_put_down_intention;
            } else {
                return new Intention(this, 'random_move');
            }
        } else if (me.number_of_parcels_carried > 0) {
            return go_put_down_intention;
        } else {
            return new Intention(this, 'random_move');
        }
    }

    order_intentions() {
        // Sort intentions by priority
        let ordered_intentions = new Array();

        if (this.intention_queue.length == 0) {
            return;
        }

        // Filter only the go_pick_up intentions
        const go_put_down_intention = this.intention_queue.filter(intention => intention.predicate !== 'go_pick_up')[0];

        const go_pick_up_intentions = this.intention_queue.filter(intention => intention.predicate === 'go_pick_up');
        ordered_intentions.push(...go_pick_up_intentions);

        // idea: o prendo un nuovo pacchetto o lascio quelli che ho
        // finchè reisco ad aumentare il reward prendo pacchetti
        // altriementi lascio

        if (go_pick_up_intentions.length > 0) {
            // Sort intentions by utility
            ordered_intentions = go_pick_up_intentions.sort((a, b) => {
                const utilityA = a.get_utility()['utility'];
                const utilityB = b.get_utility()['utility'];
                return utilityB - utilityA;
            });
        }
        let expected_reward = 0;
        if (ordered_intentions.length == 0) {
            return this.intention_queue;
        }
        const me = ordered_intentions[0].get_args()[2];
        let i = me.number_of_parcels_carried;
        console.log('i', i);
        let _start = { x: me.x, y: me.y };
        let j = 0;
        for (let intention of ordered_intentions) {

            let intention_utility = intention.get_utility(_start = { x: _start.x, y: _start.y });
            let utility = intention_utility['utility'];
            let path_length = intention_utility['path_length'];
            let added_reward = utility - i * path_length + path_length;
            if (added_reward < 0) {
                // ordered_intentions = ordered_intentions.slice(0, i);
                ordered_intentions.splice(0, j, go_put_down_intention);
                // me.number_of_parcels_carried = 0;
                break;
            }
            expected_reward += added_reward;
            if (intention) {
                _start = intention.get_args()[0];
            } else {
                console.log('intention is undefined');
            }
            j++;
        }


        ordered_intentions.push(go_put_down_intention);
        this.intention_queue = ordered_intentions;
    }

    async loop() {
        while (true) {
            // Consumes intention_queue if not empty
            const intention = this.select_best_intention();

            // if (intention && intention.predicate != 'go_put_down') {
            // }

            if (intention) {
                // console.log('intentionRevision.loop', this.intention_queue.map(i => i.predicate));

                // Current intention

                // Is queued intention still valid? Do I still want to achieve it?
                // TODO this hard-coded implementation is an example
                // let id = intention.predicate[2]
                // let p = parcels.get(id)
                // if ( p && p.carriedBy ) {
                //     console.log( 'Skipping intention because no more valid', intention.predicate )
                //     continue;
                // }

                // Start achieving intention
                await intention.achieve()
                    // Catch eventual error and continue
                    .catch(error => {
                        intention.stop();
                        console.log('Failed intention', intention.predicate, 'with error:', error)
                    });
            }
            // Postpone next iteration at setImmediate
            await new Promise(res => setImmediate(res));
        }
    }

    // async push ( predicate ) { }

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

        // Force current intention stop 
        // if ( last ) {
        //     last.stop();
        // }
    }

}


class IntentionRevisionRevise extends IntentionRevisionAgent {



    async push(predicate, ...args) {
        console.log('Revising intention queue. Received', ...predicate);
        const intention = new Intention(this, predicate, ...args);
        this.intention_queue.push(intention);
        // TODO
        // - order intentions based on utility function (reward - cost) (for example, parcel score minus distance)
        // - eventually stop current one
        // - evaluate validity of intention
    }

}

export default IntentionRevisionRevise;