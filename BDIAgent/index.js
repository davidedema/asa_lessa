import Grid from "./Grid.js";
import Me from "./Me.js";
import client from "./client.js";
import IntentionRevisionRevise from "./IntentionRevision.js";
import Msg from "./Msg.js";
import { handleMsg } from "./handleMsg.js"

var grid = undefined;
var me = new Me();

// Update Me objet with the values received from the server
client.onYou(({ id, name, x, y, score }) => {
    me.setValues({ id, name, x, y, score });
    myAgent.me = me;
})

const parcels = new Map();
const perceivedAgents = new Map();
const myAgent = new IntentionRevisionRevise(grid, me);

myAgent.loop();

/**
 * This function is the main loop of the agent, it is called every time the agent perceives a parcel
 * @param {Parcel} perceived_parcels - the perceived parcels
 * @returns 
 */
function agentLoop(perceived_parcels) {

    const parcelsToNotify = []

    if (perceived_parcels.length == 0) return;
    let time = Date.now();
    for (const p of perceived_parcels) {
        p.time = time;
        // if is active the split map strategy, the agent will consider only the parcels in his zone
        if (me.splitMapZone) {
            if (p.x >= me.splitMapZone.minX && p.x <= me.splitMapZone.maxX && p.y >= me.splitMapZone.minY && p.y <= me.splitMapZone.maxY) {
                parcels.set(p.id, p);
            }
        } else {
            parcels.set(p.id, p);
        }
    }

    // update parcels carried
    let i = 0;
    for (const p of perceived_parcels) {
        if (p.carriedBy == me.id) {
            i++;
        }
    }
    me._number_of_parcels_carried = i;

    const seenParcels = myAgent.get_parcerls_to_pickup();
    const options = [];
    for (const parcel of parcels.values()) {
        if (!parcel.carriedBy && !seenParcels.includes(parcel.id)) {
            options.push({ desire: 'go_pick_up', args: [parcel, grid, me] });
            parcelsToNotify.push(parcel);
        }
    }

    // if i have a friend, i can send him the perceived parcels
    if (me.strategy !== "split_map" && me.friendId && parcelsToNotify.length > 0) {
        let msg = new Msg();
        msg.setHeader("INFO_PARCELS");
        msg.setContent(parcelsToNotify);
        client.say(me.friendId, msg);
    }

    // push all the pick up intention in the agent intentions
    for (const option of options) {
        myAgent.push(option.desire, ...option.args)
    }

}
/**
 * This function is called every time the agent perceives other agents in the environment
 * @param {agents} perceived_agents - List of perceived agents 
 */
async function agentPerception(perceived_agents) {
    const timeSeen = Date.now();

    perceivedAgents.forEach((value, key) => {
        value.isNear = false;
        if (timeSeen - value.timeSeen > 20000) {
            perceivedAgents.delete(key);
        }
    });

    for (const agent of perceived_agents) {
        perceivedAgents.set(agent.id, { agent, timeSeen, isNear: true });
        grid.setAgent(agent.id, agent.x, agent.y, timeSeen)
    }

    if (me.friendId && perceived_agents.length > 0) {
        let msg = new Msg();
        msg.setHeader("INFO_AGENTS");
        msg.setContent(perceived_agents);
        client.say(me.friendId, msg);
    }
}

client.onParcelsSensing(async (perceived_parcels) => agentLoop(perceived_parcels));

client.onAgentsSensing(async (perceived_agents) => agentPerception(perceived_agents));

// Set up the grid with the map received from the server
client.onMap((height, width, map) => {
    grid = new Grid(width, height);
    for (const { x, y, delivery } of map) {
        grid.set(y, x, delivery ? 1 : 2);
    }
    grid.setIds();
    const parcelSpawner = [];
    for (const parcel of map) {
        if (parcel.parcelSpawner) {
            parcelSpawner.push({ x: parcel.x, y: parcel.y });
        }
    }
    grid.setSpawnPoints(parcelSpawner);
    myAgent.grid = grid;
});

// Set up the agent with the configuration received from the server
client.onConfig((config) => {
    if (config.PARCEL_DECADING_INTERVAL != 'infinite') {
        // from string to int
        var pointLossInOneSecond = parseInt(config.PARCEL_DECADING_INTERVAL.slice(0, -1));
        me.pointLossInOneSecond = pointLossInOneSecond;
    }
    else {
        me.pointLossInOneSecond = NaN;
    }
    if (config['MOVEMENT_DURATION']) {
        me.movementDuration = config['MOVEMENT_DURATION'];
    }
});


// Function used to handle the messages received from the server
client.onMsg(async (id, name, msg, replyAcknowledgmentCallback) => handleMsg(id, name, msg, replyAcknowledgmentCallback, me, grid, client, myAgent, perceivedAgents));

// send a message to init the handshake with the other agent
client.onConnect(async () => {
    if (me.master) {
        let msg = new Msg();
        msg.setHeader("HANDSHAKE");
        msg.setContent("acquarium?")
        await client.shout(msg);
    }
});