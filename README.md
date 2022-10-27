# Pekachain
### Developer: [Abel Akponine](https://github.com/abelakponine)
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
