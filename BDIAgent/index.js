import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import Agent from "./Agent.js";
import Grid from "./Grid.js";
import Me from "./Me.js";
import Plan from "./Plan.js";
import Intention from "./Intention.js";
import client from "./client.js";


function distance({ x: x1, y: y1 }, { x: x2, y: y2 }) {
    const dx = Math.abs(Math.round(x1) - Math.round(x2))
    const dy = Math.abs(Math.round(y1) - Math.round(y2))
    return dx + dy;
}

var grid = undefined;

var me = new Me();
/**
 * Belief revision function
 */

client.onYou(({ id, name, x, y, score }) => {
    me.setValues({ id, name, x, y, score });
})

client.onMap((width, height, map) => {
    console.log('map', width, height, map);
})

const parcels = new Map();
client.onParcelsSensing(async (perceived_parcels) => {
    for (const p of perceived_parcels) {
        parcels.set(p.id, p)
    }
})


const myAgent = new Agent();
myAgent.intentionLoop();

/**
 * BDI loop
 */

function agentLoop() {

    /**
     * Options
     */
    const options = [];
    for (const parcel of parcels.values())
        if (!parcel.carriedBy && me.carring === false)
            options.push({ desire: 'go_to_astar', args: [parcel, grid, me, myAgent] });


    /**
     * Select best intention
     */
    let best_option;
    let nearest = Number.MAX_VALUE;
    for (const option of options) {
        let current_i = option.desire
        let current_d = distance(option.args[0], me)
        if (current_i == 'go_to_astar' && current_d < nearest) {
            best_option = option
            nearest = distance(option.args[0], me)
        }
    }

    /**
     * Revise/queue intention 
     */
    if (best_option) {
        myAgent.queue(best_option.desire, ...best_option.args)
        myAgent.queue('pickup', {});
        myAgent.queue('go_to', { x: 1, y: 1 }, me)
    }


}
client.onParcelsSensing(agentLoop)
// client.onAgentsSensing( agentLoop )
// client.onYou( agentLoop )

client.onMap((width, height, map) => {
    grid = new Grid(width, height);
    for (const { x, y, delivery } of map) {
        grid.set(y, x, delivery ? 'O' : '+');
    }
    grid.easystar.setGrid(grid.getMap());
    grid.easystar.setAcceptableTiles(['+', 'O']);
})

