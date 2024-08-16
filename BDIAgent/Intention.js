import BlindMove from "./Actions/BlindMove.js";
import GoPickUp from "./Actions/GoPickUp.js";
import GotoA from "./Actions/GotoA.js";
import GoPutDown from "./Actions/GoPutDown.js";
import RandomMove from "./Actions/RandomMove.js";
import { astar, Graph } from './astar.js';
import configPromise from './config.js';
import PDDLMove from "./Actions/PDDLMove.js";

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
plans.push(new PDDLMove());

const findClosestDeliveryPoint = (x, y, grid, deliveryPoints) => {
    const graph = new Graph(grid);
    const start = graph.grid[x][y];
    const end = graph.grid[deliveryPoints[0].x][deliveryPoints[0].y];

    let closestDeliveryPoint = astar.search(graph, start, end);
    for (const deliveryPoint of deliveryPoints) {
        const end = graph.grid[deliveryPoint.x][deliveryPoint.y];
        if (start.x === end.x && start.y === end.y) {
            return end;
        }
        const result = astar.search(graph, start, end);
        if (closestDeliveryPoint.length > 0 && result.length > 0){
            if (result.length < closestDeliveryPoint.length) {
                closestDeliveryPoint = result;
            }
        }else{
            if(result.length > 0){
                closestDeliveryPoint = result;
            }
        }
    }
    return closestDeliveryPoint[closestDeliveryPoint.length - 1];
}

class Intention {

    // Plan currently used for achieving the intention 
    #current_plan;

    // This is used to stop the intention
    #stopped = false;
    get stopped() {
        return this.#stopped;
    }

    print() {
        console.log('Intention', this.#predicate, this.#args, this.#utility);
    }

    stop() {
        this.log('stop intention', this.#predicate);
        this.#stopped = true;
        if (this.#current_plan)
            this.#current_plan.stop();
    }

    /**
     * #parent refers to caller
     */
    #parent;

    /**
     * predicate is in the form ['go_to', x, y]
     */
    get predicate() {
        return this.#predicate;
    }

    get utility() {
        return this.#utility;
    }

    #predicate;
    #args;
    #utility;
    #father_desire;

    constructor(parent, father_desire, predicate, ...args) {
        this.#parent = parent;
        this.#father_desire = father_desire;
        this.#predicate = predicate;
        this.#args = args;
    }

    get_args() {
        return this.#args;
    }

    get_predicate() {
        return this.#predicate;
    }


    log(...args) {
        if (this.#parent && this.#parent.log)
            this.#parent.log('\t', ...args)
        else
            console.log(...args)
    }

    get_utility(num_parcels_carried, _start = null) {
        const parcel = this.#args[0];
        const me = this.#args[2];
        const grid = this.#args[1];
        const graph = new Graph(grid.getMap());
        let start = null;
        if (_start) {
            start = graph.grid[_start.x][_start.y]
        } else {
            start = graph.grid[parseInt(me.x)][parseInt(me.y)];
        }
        const end = graph.grid[parseInt(parcel.x)][parseInt(parcel.y)];
        const result = astar.search(graph, start, end);
        const path_length = result.length;
        let decad = parseFloat(config['PARCEL_DECADING_INTERVAL'].slice(0, -1));
        if (decad == 0) {
            decad = 1;
        }
        if (config['PARCEL_DECADING_INTERVAL'] == 'infinite') {
            decad = 1;
        }

        const deliveryPoints = grid.getDeliverPoints();
        let deliveryPoint = findClosestDeliveryPoint(parseInt(parcel.x), parseInt(parcel.y), grid.getMap(), deliveryPoints);

        if (deliveryPoint === undefined){
            return { utility: -Infinity, path_length };
        }

        deliveryPoint = graph.grid[deliveryPoint.x][deliveryPoint.y];
        const delivery_result = astar.search(graph, end, deliveryPoint);
        const deliery_path_length = delivery_result.length;

        const utility = parcel.reward - num_parcels_carried * path_length * 1/decad - (num_parcels_carried +1) * deliery_path_length * 1/decad// * (1 / parseFloat(config['PARCEL_DECADING_INTERVAL'].slice(0,-1)));
        this.#utility = utility;
        return { utility, path_length };
    }

    #started = false;
    /**
     * Using the plan library to achieve an intention
     */
    async achieve() {
        // Cannot start twice
        if (this.#started)
            return this;
        else
            this.#started = true;

        // Trying all plans in the library
        for (const planClass of plans) {

            // if stopped then quit
            if (this.stopped) throw ['stopped intention', ...this.predicate];

            // if plan is 'statically' applicable
            if (planClass.isApplicableTo(this.predicate)) {
                try {
                    if (this.#father_desire === "SPLIT" ){
                        this.log()
                    }
                    const plan_res = await planClass.execute(this.#parent,this.#father_desire, ...this.#args);
                    // this.log( 'succesful intention', this.predicate, 'with plan', planClass.name, 'with result:', plan_res );
                    return plan_res
                    // or errors are caught so to continue with next plan
                } catch (error) {
                    // this.log('failed intention', this.predicate, 'with plan', planClass.name, 'with error:', error);
                }
            }

        }

        // if stopped then quit
        if (this.stopped) throw ['stopped intention', ...this.predicate];

        // no plans have been found to satisfy the intention
        // this.log( 'no plan satisfied the intention ', ...this.predicate );
        throw ['no plan satisfied the intention ', ...this.predicate]
    }

}




export default Intention;