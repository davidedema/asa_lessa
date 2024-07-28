import { Beliefset, onlineSolver, PddlExecutor, PddlProblem } from "@unitn-asa/pddl-client";

import fs from 'fs';

function readFile ( path ) {
    
    return new Promise( (res, rej) => {

        fs.readFile( path, 'utf8', (err, data) => {
            if (err) rej(err)
            else res(data)
        })

    })

}

const beliefs = new Beliefset();



var pddlProb = new PddlProblem(
    'lights',
    'light1 light2',
    '(switched-off light1) (switched-off light2)',
    'amd (switched-on light1) (switched-on light2)',
);

var domain = await readFile('/home/davide/Desktop/asa_lessa/BDIAgent/PDDL/domain-lights.pddl');
var problem = pddlProb.toPddlString();


var plan = await onlineSolver(domain, problem);
const pddlExecutor = new PddlExecutor({
    name: 'lightOn',
    executor: (l) => console.log('lightOn', l)
});

pddlExecutor.exec(plan);