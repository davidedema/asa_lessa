import { onlineSolver, PddlExecutor, PddlExecutor } from "@unitn-asa/pddl-client";

import fs from 'fs';

function readFile ( path ) {
    
    return new Promise( (res, rej) => {

        fs.readFile( path, 'utf8', (err, data) => {
            if (err) rej(err)
            else res(data)
        })

    })

}

domain = await readFile('domain-lights.pddl');
problem = await readFile('problem-lights.pddl');


var plan = await onlineSolver(domain, problem);
const pddlExecutor = new PddlExecutor({
    name: 'lightOn',
    executor: (l) => console.log('lightOn', l)
});

pddlExecutor.exec(plan);