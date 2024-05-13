import BlindMove from "./Actions/BlindMove.js";
import GoPickUp from "./Actions/GoPickUp.js";
import GotoA from "./Actions/GotoA.js";
import GoPutDown from "./Actions/GoPutDown.js";
import RandomMove from "./Actions/RandomMove.js";
import {astar, Graph} from './astar.js';
import configPromise from './config.js';   

const plans = [];

let config;
configPromise.then((conf) => {
    config = conf;
});

plans.push(new GoPickUp());
plans.push(new BlindMove());
plans.push(new GotoA());
plans.push(new GoPutDown());
plans.push(new RandomMove());

// class Intention extends Promise {

//     #current_plan;
//     stop() {
//         console.log('stop intention and current plan');
//         this.#current_plan.stop();
//     }

//     #desire;
//     #args;

//     #resolve;
//     #reject;

//     constructor(desire, ...args) {
//         var resolve, reject;
//         super(async (res, rej) => {
//             resolve = res; reject = rej;
//         })
//         this.#resolve = resolve
//         this.#reject = reject
//         this.#desire = desire;
//         this.#args = args;
//     }

//     #started = false;
//     async achieve() {
//         if (this.#started)
//             return this;
//         else
//             this.#started = true;

//         for (const plan of plans) {
//             if (plan.isApplicableTo(this.#desire)) {
//                 this.#current_plan = plan;
//                 // console.log('achieving desire', this.#desire, ...this.#args, 'with plan', plan);
//                 try {
//                     const plan_res = await plan.execute(...this.#args);
//                     this.#resolve(plan_res);
//                     // console.log('plan', plan, 'succesfully achieved intention', this.#desire, ...this.#args, 'with result', plan_res);
//                     return plan_res
//                 } catch (error) {
//                     // console.log('plan', plan, 'failed while trying to achieve intention', this.#desire, ...this.#args, 'with error', error);
//                 }
//             }
//         }

//         this.#reject();
//         // console.log('no plan satisfied the desire ', this.#desire, ...this.#args);
//         // throw 'no plan satisfied the desire ' + this.#desire;
//     }

// }


class Intention {

    // Plan currently used for achieving the intention 
    #current_plan;
    
    // This is used to stop the intention
    #stopped = false;
    get stopped () {
        return this.#stopped;
    }

    stop () {
        this.log( 'stop intention', ...this.#predicate );
        this.#stopped = true;
        if ( this.#current_plan)
            this.#current_plan.stop();
    }

    /**
     * #parent refers to caller
     */
    #parent;

    /**
     * predicate is in the form ['go_to', x, y]
     */
    get predicate () {
        return this.#predicate;
    }

    get utility () {
        return this.#utility;
    }

    #predicate;
    #args;
    #utility;

    constructor ( parent, predicate , ...args) {
        this.#parent = parent;
        this.#predicate = predicate;
        this.#args = args;
    }

    get_args () {
        return this.#args;
    }


    log ( ...args ) {
        if ( this.#parent && this.#parent.log )
            this.#parent.log( '\t', ...args )
        else
            console.log( ...args )
    }

    get_utility (num_parcels_carried, _start = null) {
        const parcel = this.#args[0];
        const me = this.#args[2];
        const grid = this.#args[1];
        const graph = new Graph(grid.getMap());
        let start = null;
        if(_start){
            start = graph.grid[_start.x][_start.y]
        }else {
            start = graph.grid[parseInt(me.x)][parseInt(me.y)];
        }        
        const end = graph.grid[parseInt(parcel.x)][parseInt(parcel.y)];
        const result = astar.search(graph, start, end);
        const path_length = result.length;
        let decad = parseFloat(config['PARCEL_DECADING_INTERVAL'].slice(0,-1));
        if (decad == 0) {
            decad = 1;
        }
        if (config['PARCEL_DECADING_INTERVAL'] == 'infinite'){
            decad = 1;
        }
        // console.log('decad', decad);


        const utility = parcel.reward - num_parcels_carried * path_length *decad ;// * (1 / parseFloat(config['PARCEL_DECADING_INTERVAL'].slice(0,-1)));
        this.#utility = utility;
        return {utility, path_length};
        console.log('get_utility', this.#predicate);
    }

    #started = false;
    /**
     * Using the plan library to achieve an intention
     */
    async achieve () {
        // Cannot start twice
        if ( this.#started)
            return this;
        else
            this.#started = true;

        // Trying all plans in the library
        for (const planClass of plans) {

            // if stopped then quit
            if ( this.stopped ) throw [ 'stopped intention', ...this.predicate ];

            // if plan is 'statically' applicable
            if ( planClass.isApplicableTo( this.predicate ) ) {
                // plan is instantiated
                // this.#current_plan = new planClass(this.parent);
                // this.log('achieving intention', ...this.predicate, 'with plan', planClass.name);
                // and plan is executed and result returned
                try {
                    const plan_res = await planClass.execute( ...this.#args );
                    // this.log( 'succesful intention', this.predicate, 'with plan', planClass.name, 'with result:', plan_res );
                    return plan_res
                // or errors are caught so to continue with next plan
                } catch (error) {
                    this.log( 'failed intention', this.predicate,'with plan', planClass.name, 'with error:', error );
                }
            }

        }

        // if stopped then quit
        if ( this.stopped ) throw [ 'stopped intention', ...this.predicate ];

        // no plans have been found to satisfy the intention
        // this.log( 'no plan satisfied the intention ', ...this.predicate );
        throw ['no plan satisfied the intention ', ...this.predicate ]
    }

}




export default Intention;