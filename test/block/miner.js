'use strict';

var chai = require('chai');
var should = chai.should();

var bitcore = require('../..');
var Block = bitcore.Block;
var Transaction = bitcore.Transaction;
var Miner = bitcore.Miner;
var PrivateKey = bitcore.PrivateKey;

describe('Miner', function() {


  this.timeout(10000);

  var id = new PrivateKey('ecf4fd8e3c6b7cebeb028ceada16a24e266869e352e80971438bbb03db1c54e4');
  var opts = {};
  var coinbases = [];
  for (var i = 0; i < 100; i++) {
    coinbases.push(new Transaction()
      .at(0, i + 1)
      .to(id.publicKey)
      .colored(0xff0000ff)
    );
  }
  opts.coinbase = coinbases[0];
  opts.previous = Block.genesis;
  opts.time = 1432594281;
  var blockchain = [];
  blockchain.push(Block.genesis);

  it('mines genesis block', function(cb) {
    var genesisTx = new Transaction()
      .at(0, 0)
      .to('03000000000000000006fd1af568353887e69e992938cbd5d40fb026467e2fef7c')
      .colored(0x13371337);

    var miner = new Miner({
      coinbase: genesisTx,
      previous: {
        header: {
          height: -1
        },
        id: '0000000000000000000000000000000000000000000000000000000000000000'
      },
      time: 1433037823,
      bits: 0x1e0fffff,
      nonce: 586080
    });
    miner.on('block', function(block) {
      block.id.should.equal(Block.genesis.id);
      cb();
    });
    miner.run();

  });

  it('initializes', function() {
    var miner = new Miner(opts);
    should.exist(miner);
  });

  it('mines ' + coinbases.length + ' blocks in a row without txs', function(cb) {
    var miner = new Miner(opts);
    var n = 0;
    miner.on('block', function(block) {
      n += 1;
      //console.log('block', block.height, block.id, 'nonce', block.nonce, 'bits', block.bits.toString(16));
      block.header.validProofOfWork().should.equal(true);
      blockchain.push(block);
      block.header.height.should.equal(n);
      block.transactions.length.should.equal(1);
      if (n === coinbases.length) {
        cb();
        return;
      }

      miner.newTip(block, coinbases[n]);
      process.nextTick(miner.run.bind(miner));
    });
    miner.run();
  });

  it('mines first block without transactions', function(cb) {
    var miner = new Miner(opts);
    miner.on('block', function(block) {
      block.header.validProofOfWork().should.equal(true);
      cb();
    });
    miner.run();
  });

  it('mines second block without transactions', function(cb) {
    var opts1 = JSON.parse(JSON.stringify(opts));
    opts1.previous = blockchain[0];
    opts1.coinbase = coinbases[1];
    var miner = new Miner(opts1);
    miner.on('block', function(block) {
      block.header.validProofOfWork().should.equal(true);
      cb();
    });
    miner.run();
  });

  it('mines second block with a transaction', function(cb) {
    var opts1 = JSON.parse(JSON.stringify(opts));
    opts1.previous = blockchain[0];
    opts1.coinbase = coinbases[1];
    var miner = new Miner(opts1);
    miner.on('block', function(block) {
      block.header.validProofOfWork().should.equal(true);
      block.transactions.length.should.equal(2);
      cb();
    });
    var tx = new Transaction()
      .from(coinbases[1])
      .to(id.publicKey)
      .colored(0x00ff00ff)
      .sign(id);
    miner.addTransaction(tx);
    miner.run();
  });

  it('serializes and deserializes mined block', function(cb) {
    var opts1 = JSON.parse(JSON.stringify(opts));
    opts1.previous = blockchain[0];
    opts1.coinbase = coinbases[1];
    var miner = new Miner(opts1);
    miner.on('block', function(block) {
      block.header.validProofOfWork().should.equal(true);
      block.transactions.length.should.equal(2);

      var serialized = Block.fromString(block.toString());

      block.header.validProofOfWork().should.equal(true);
      serialized.toString().should.equal(block.toString());
      serialized.header.validProofOfWork().should.equal(true);
      cb();
    });
    var tx = new Transaction()
      .from(coinbases[1])
      .to(id.publicKey)
      .colored(0x00ff00ff)
      .sign(id);
    miner.addTransaction(tx);
    miner.run();
  });

  it('mines ' + coinbases.length + ' blocks in a row with txs spending prev coinbase', function(cb) {
    var opts2 = JSON.parse(JSON.stringify(opts));
    opts2.previous = blockchain[1];
    opts2.coinbase = coinbases[2];
    var miner = new Miner(opts2);
    var n = 1;
    miner.on('block', function(block) {
      n += 1;
      //console.log('block', block.header.height, block.id, block.header.nonce);
      block.header.validProofOfWork().should.equal(true);
      blockchain.push(block);
      block.header.height.should.equal(n);
      block.transactions.length.should.equal(2);
      if (n === coinbases.length) {
        cb();
        return;
      }

      miner.newTip(block, coinbases[n]);

      var tx = new Transaction()
        .from(coinbases[n])
        .to(id.publicKey)
        .colored(0x00ff00ff)
        .sign(id);
      miner.addTransaction(tx);
      process.nextTick(miner.run.bind(miner));
    });
    var tx = new Transaction()
      .from(coinbases[1])
      .to(id.publicKey)
      .colored(0x00ff00ff)
      .sign(id);
    miner.addTransaction(tx);
    miner.run();
  });

  it('mines first block without transactions and higher difficulty', function(cb) {
    opts.bits = 0x1e0fffff; // 00000fffff000000000000000000000000000000000000000000000000000000
    opts.nonce = 2561158;
    var miner = new Miner(opts);
    miner.on('block', function(block) {
      block.header.validProofOfWork().should.equal(true);
      cb();
    });
    miner.run();
  });

  it('serializes and deserializes mined tx', function(cb) {
    opts.bits = 0x1e0fffff; // 00000fffff000000000000000000000000000000000000000000000000000000
    opts.nonce = 2561158;
    var miner = new Miner(opts);
    miner.on('block', function(block) {
      block.header.validProofOfWork().should.equal(true);
      cb();
    });
    miner.run();
  });

  it('mines first block with one transaction and higher difficulty', function(cb) {
    opts.bits = 0x1e0fffff; // 00000fffff000000000000000000000000000000000000000000000000000000
    opts.nonce = 3170113;
    var miner = new Miner(opts);
    miner.on('block', function(block) {
      block.header.validProofOfWork().should.equal(true);
      block.transactions.length.should.equal(2);
      cb();
    });
    var tx = new Transaction()
      .from(coinbases[1])
      .to(id.publicKey)
      .colored(0x00ff00ff)
      .sign(id);
    miner.addTransaction(tx);
    miner.run();
  });

  it('mines first block with two transactions and moderate difficulty', function(cb) {
    opts.bits = 0x1f0fffff; // 00000fffff000000000000000000000000000000000000000000000000000000
    opts.nonce = 712;
    var miner = new Miner(opts);
    miner.on('block', function(block) {
      block.header.validProofOfWork().should.equal(true);
      block.transactions.length.should.equal(3);
      cb();
    });
    for (var i = 0; i < 100; i++) {
      miner.work();
    }
    var tx = new Transaction()
      .from(coinbases[1])
      .to(id.publicKey)
      .colored(0x00ff00ff)
      .sign(id);
    miner.addTransaction(tx);
    for (i = 0; i < 100; i++) {
      miner.work();
    }
    var tx2 = new Transaction()
      .from(tx)
      .to(id.publicKey)
      .colored(0xffffffff)
      .sign(id);
    miner.addTransaction(tx2);
    miner.run();
  });


});
