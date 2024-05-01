import Intention from "./Intention.js";

class IntentionRevisionAgent {

    #intention_queue = new Array();
    get intention_queue () {
        return this.#intention_queue;
    }

    async loop ( ) {
        while ( true ) {
            // Consumes intention_queue if not empty
            if ( this.intention_queue.length > 0 ) {
                console.log( 'intentionRevision.loop', this.intention_queue.map(i=>i.predicate) );
            
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
                .catch( error => {

                    wconsole.log( 'Failed intention',intention.predicate, 'with error:', error )
                } );

                // Remove from the queue
                this.intention_queue.shift();
            }
            // Postpone next iteration at setImmediate
            await new Promise( res => setImmediate( res ) );
        }
    }

    // async push ( predicate ) { }

    log ( ...args ) {
        console.log( ...args )
    }

}

class IntentionRevisionReplaceAgent extends IntentionRevisionAgent {

    async push ( predicate, ...args ) {

        let last = undefined;
        // Check if already queued
        if (this.intention_queue.length - 1 >= 0){
            last = this.intention_queue[this.intention_queue.length - 1 ];
            if ( last && last.predicate == predicate ) {
                return; // intention is already being achieved
            }
        }

        console.log( 'IntentionRevisionReplace.push', predicate );
        const intention = new Intention( this, predicate, ...args );
        this.intention_queue.push( intention );
        
        // Force current intention stop 
        // if ( last ) {
        //     last.stop();
        // }
    }

}

export default IntentionRevisionReplaceAgent;