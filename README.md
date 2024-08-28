![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
<p align='center'>
    <h1 align="center">ASA Lessa</h1>
    <p align="center">
    Project for Autonomous Software Agents at the University of Trento A.Y.2023/2024
    </p>
    <p align='center'>
    Developed by:<br>
    De Martini Davide <br>
    Rigon Mattia <br>
    </p>   
</p>

----------

- [Project Description](#project-description)
- [Project structure](#project-structure)
- [Installation](#installation)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation-1)
- [Running the project](#running-the-project)
  - [Runnining PDDL locally](#runnining-pddl-locally)


## Project Description
The aim of this project was to develop a set of agents capable of cooperate with each other. The main goal of the game is to navigate the maps in order to pick up and deliver as many parcels as possible. 
## Project structure
```
asa_lessa
├── BDIAgent
│   ├── Actions
│   │   ├── GoPickUp.js
│   │   ├── GoPutDown.js
│   │   ├── GotoA.js
│   │   ├── PDDLMove.js
│   │   └── RandomMove.js
│   ├── Agent.js
│   ├── astar.js
│   ├── client.js
│   ├── config.js
│   ├── Grid.js
│   ├── handleMsg.js
│   ├── index.js
│   ├── Intention.js
│   ├── IntentionRevision.js
│   ├── Me.js
│   ├── Msg.js
│   ├── PDDL
│   │   ├── domain.pddl
│   │   ├── pddlPlanner.js
│   │   └── problem.pddl
│   ├── Plan.js
│   └── utils.js
├── package.json
└── README.md
```
The entrypoint is `index.js`
## Installation
### Prerequisites
Nodejs and npm has to be installed in the system, the project is tested with the node version `v22.0.0`.
### Installation
In order to run the project you'll need to clone it and install the requirements. 
- Clone it

    ```BASH
    git clone https://github.com/davidedema/asa_lessa

    ```
- Then go inside the cloned directiory and install all the dependencies
  ```
  cd asa_lessa
  npm install
  ```

## Running the project
There are a few mode for running the project:
Running in single agent scenario: 
- bdi agent no PDDL
    ```
    npm run bdi
    ```
- bdi agent PDDL
    ```
    npm run bdi_pddl
    ```
Running in multi agent scenario: 
- Simple multi agent no PDDL    
    ```
    bdi_slave
    bdi_master
    ```
- Simple multi agent PDDL    
    ```
    bdi_pddl_slave
    bdi_pddl_master
    ```
- Split map multi agent    
    ```
    bdi_slave_split_map
    bdi_master_split_map
    ```
- Padding parcels multi agent
    ```
    bdi_slave_passing
    bdi_master_passing
    ```
### Runnining PDDL locally

In order to run the PDDL solution locally, refer to [Planning as a Service](https://github.com/AI-Planning/planning-as-a-service) and follow the commands.

Then, you need to go to ```node_modules/@unitn-asa/pddl-client/src/PddlOnlineSolver.js```. Here you are going to change the parameters to the following:
```bash
const HOST = process.env.PAAS_HOST || 'http://localhost:5001';
const PATH = process.env.PAAS_PATH || '/package/optic/solve';
```