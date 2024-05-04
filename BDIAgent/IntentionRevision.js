import Intention from "./Intention.js";

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

    order_intentions() {
        // Sort intentions by priority
        let ordered_intentions = new Array();

        if (this.intention_queue.length == 0) {
            return;
        }

        // Filter only the go_pick_up intentions
        const go_pick_up_intentions = this.intention_queue.filter(intention => intention.predicate === 'go_pick_up');
        ordered_intentions.push(...go_pick_up_intentions);

        // idea: o prendo un nuovo pacchetto o lascio quelli che ho
        // finchè reisco ad aumentare il reward prendo pacchetti
        // altriementi lascio

        if (go_pick_up_intentions.length > 0) {
            // Sort intentions by utility
            ordered_intentions = go_pick_up_intentions.sort((a, b) => {
                const utilityA = a.get_utility();
                const utilityB = b.get_utility();
                return utilityB - utilityA;
            });
        }


        const go_put_down_intentions = this.intention_queue.filter(intention => intention.predicate !== 'go_pick_up');
        ordered_intentions.push(...go_put_down_intentions);
        this.intention_queue = ordered_intentions;
    }

    async loop() {
        while (true) {
            // Consumes intention_queue if not empty
            this.order_intentions()
            if (this.intention_queue.length > 0) {
                console.log('intentionRevision.loop', this.intention_queue.map(i => i.predicate));

                // Current intention
                const intention = this.intention_queue[0];

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

                // Remove from the queue
                this.intention_queue.shift();
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