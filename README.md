<<<<<<< HEAD
# Pekachain
### Developer: [https://github.com/abelakponine](Abel Akponine)
This is the backend implementation for Pekaboom Blockchain, using BigchainDB, Tendermint and MongoDB for the blockchain server

- Website: https:// pekaboom.com
- BigchainDB: https://bigchaindb.pekaboom.com
- Tendermint: https://server.pekaboom.com:26657

## ==== Connecting new peers ====

Your p2p setup in config.toml should look like this:

[p2p]

### Address to listen for incoming connections
laddr = "tcp://0.0.0.0:26656"

 1. You need your peer node to connect to port 26656
 2. Add new peer nodes in this format &lt;nodeId&gt;@&lt;nodeAddr&gt;:26656

    For example:
    ### Comma separated list of seed nodes to connect to
    seeds = "cdaac165ec5d1599aea3e6ea62643d87f7f8ef52@test123.com:26656, 46aac165ec5d1599aea3e6ea62643d87f7f8ef52@32.133.22.222:26656"

 3. If you still get a failed to Dail error ...pex etc, this will be because of firewall blocking connection on your machine, ensure to add port 26656 through firewall in your machine and also run ufw allow 26656 on ssh

 4. Run <code>tendermint unsafe_reset_all</code> then <code>tendermint node</code> again after those steps, it should work

## ==== Fix new peer node connection already synced ====

I was having this same issue when adding new peers but was able to solve it with the following steps.

I realized I was changing the genesis.json file immediately after setting up tendermint which results in this issue on first run.

1. Run <code>tendermint node</code> after setup without changing genesis.json file i.e use the default genesis.json file,
2. you can run: <code>rm -rf ~/.tendermint</code> to delete the old setup, then run: <code>tendermint init</code> to generate a new genesis file
3. Run <code>tendermint node</code> to start the server. This will initialze tendermint with default and genesis.json file.
4. After initial run, stop server
5. Edit config.toml file of new peer node to your taste
6. Now copy the genesis of the main node into genesis.json file of the new peer node and save
7. Run <code>tendermint unsafe_reset_all</code> on new peer node
8. Run <code>tendermint node</code> on new peer node
=======
# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
>>>>>>> aecdde603ca1971bf265b340f13c570215f147e9
