import Grid from "./Grid.js";
import Me from "./Me.js";
import client from "./client.js";
import IntentionRevisionRevise from "./IntentionRevision.js";
import Msg from "./Msg.js";

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
    myAgent.me =  me;
})

const parcels = new Map();

const perceivedAgents = new Map();

const myAgent = new IntentionRevisionRevise(grid, me);
myAgent.loop();

/**
 * BDI loop
*/

function agentLoop(perceived_parcels) {
    if (perceived_parcels.length == 0) return;
    let time = Date.now();
    for (const p of perceived_parcels) {
        p.time = time;
        if (me.splitMapZone) {
            if (p.x >= me.splitMapZone.minX && p.x <= me.splitMapZone.maxX && p.y >= me.splitMapZone.minY && p.y <= me.splitMapZone.maxY) {
                parcels.set(p.id, p);
            }
        } else {
            parcels.set(p.id, p);
        }
    }

    // if i have a friend, i can send him the perceived parcels
    if (me.strategy !== "split_map" && me.friendId && perceived_parcels.length > 0) {
        let msg = new Msg();
        msg.setHeader("INFO_PARCELS");
        msg.setContent(perceived_parcels);
        client.say(me.friendId, msg);
    }

    // update parcels carried
    let i = 0;
    for (const p of perceived_parcels) {
        if (p.carriedBy == me.id) {
            i++;
        }
    }
    me._number_of_parcels_carried = i;
    // console.log('number of parcels carried', me._number_of_parcels_carried)
    /**
     * Options
    */
    const seenParcels = myAgent.get_parcerls_to_pickup();
    const options = [];
    for (const parcel of parcels.values()) {
        if (!parcel.carriedBy && !seenParcels.includes(parcel.id)) {
            options.push({ desire: 'go_pick_up', args: [parcel, grid, me] });
        }
    }


    /**
     * Select best intention
    */
    let best_option;
    let nearest = Number.MAX_VALUE;
    for (const option of options) {
        let current_i = option.desire
        let current_d = distance(option.args[0], me)
        if (current_i == 'go_pick_up' && current_d < nearest) {
            best_option = option
            nearest = current_d
        }
    }

    /**
     * Revise/queue intention 
    */
    if (best_option) {
        myAgent.push(best_option.desire, ...best_option.args)
        myAgent.push('go_put_down', grid, grid.getDeliverPoints(), me);
    }


}

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

    if (me.friendId) {
        let msg = new Msg();
        msg.setHeader("INFO_AGENTS");
        msg.setContent(perceived_agents);
        client.say(me.friendId, msg);
    }
}

client.onParcelsSensing(async (perceived_parcels) => agentLoop(perceived_parcels));

client.onAgentsSensing(async (perceived_agents) => agentPerception(perceived_agents));


client.onMap((width, height, map) => {
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


client.onConfig((config) => {
    if (config.PARCEL_DECADING_INTERVAL != 'infinite') {
        // from string to int
        var decay = parseInt(config.PARCEL_DECADING_INTERVAL.slice(0, -1));
        me.decay = decay;
    }
    // TODO change this one
    else {
        me.decay = 99999999;
    }
});

async function handleMsg(id, name, msg, replyAcknowledgmentCallback) {
    // finalize the handshake
    if (msg.header == 'HANDSHAKE') {
        if (!me.master && msg.content == 'acquarium?') {
            me.setFriendId(id);
            let msg = new Msg();
            msg.setHeader("HANDSHAKE");
            msg.setContent("acquarium!");
            await client.say(id, msg, replyAcknowledgmentCallback);
        }
        if (me.master && msg.content == 'acquarium!') {
            me.setFriendId(id);
            console.log('Handshake completed');
            let msg = new Msg();
            msg.setHeader("START_JOB");
            msg.setContent({ x: me.x, y: me.y });
            await client.say(id, msg, replyAcknowledgmentCallback);
            console.log(me.strategy)
            if (me.strategy === "split_map") {

                msg = new Msg();
                msg.setHeader("SPLIT_MAP");

                if (me.y > grid.height / 2) {
                    console.log("MASTER GRID ALTA")
                    const zone = {
                        minX: 0,
                        maxX: grid.width,
                        minY: Math.floor(grid.height / 2),
                        maxY: grid.height
                    }
                    console.log(zone)
                    me.setSplitMapZone(zone)
                    const slaveZone = {
                        minX: 0,
                        maxX: grid.width,
                        minY: 0,
                        maxY: Math.floor(grid.height / 2) - 1
                    }

                    msg.setContent(slaveZone)

                } else {
                    console.log("MASTER GRID BASSA")

                    const zone = {
                        minX: 0,
                        maxX: grid.width,
                        minY: 0,
                        maxY: Math.floor(grid.height / 2) - 1
                    }
                    console.log(zone)

                    me.setSplitMapZone(zone)
                    const slaveZone = {
                        minX: 0,
                        maxX: grid.width,
                        minY: Math.floor(grid.height / 2),
                        maxY: grid.height
                    }

                    msg.setContent(slaveZone)
                }


                await client.say(id, msg)
            }

        }
    }

    // exchange informations
    // parcels
    if (msg.header === 'INFO_PARCELS') {
        // see content and update the parcels if not already present
        let new_parcels = msg.content;
        for (const p of new_parcels) {
            if (!parcels.has(p.id)) {
                parcels.set(p.id, p);
            }
        }

    } else if (msg.header === 'INFO_AGENTS') {
        let perceived_agents = msg.content;

        for (const agent of perceived_agents) {
            perceivedAgents.set(agent.id, agent);
            grid.setAgent(agent.id, agent.x, agent.y, Date.now())

            // console.log("set perceived agents" + agent.name + " : " + agent.x + " " + agent.y);
        }
    } else if (msg.header === "SPLIT_MAP") {
        me.setSplitMapZone(msg.content)
        const zone = msg.content;
        const destination = { x: zone.minX, y: zone.minY };
        if (me.x >= zone.minX && me.x <= zone.maxX && me.y >= zone.minY && me.y <= zone.maxY) {
            console.log("SLAVE ALREADY IN THE CORRECT ZONE");
        } else {
            console.log("SLAVE HAS TO MOVE IN THE CORRRECT ZONE");
            const map = grid.getMap()
            let _brake = false;
            for (let i = zone.minX; i <= zone.maxX; i++) {

                for (let j = zone.minY; j <= zone.maxY; j++) {
                    if (map[i][j] !== 0) {
                        destination.x = i
                        destination.y = j
                        _brake = true;
                        break;
                    }
                }
                if (_brake) { break }
            }
            myAgent.push("go_to_astar", destination, grid, me)
        }
        console.log(msg.content)
    }else if (msg.header === "CURRENT_INTENTION"){
        console.log("RECEIVED INTENTION")
    }else if (msg.header === "COMPLETED_INTENTION"){
        console.log("COMPLETED INTENTION" , msg.content)
    }
}

// Essendo un architettura master-slave, il master inizializza la comunicazione, il slave risponde
client.onMsg(async (id, name, msg, replyAcknowledgmentCallback) => handleMsg(id, name, msg, replyAcknowledgmentCallback));

// send a message to init the handshake

client.onConnect(async () => {
    if (me.master) {
        let msg = new Msg();
        msg.setHeader("HANDSHAKE");
        msg.setContent("acquarium?")
        await client.shout(msg);
    }
});