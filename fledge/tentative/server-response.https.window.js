// META: script=/resources/testdriver.js
// META: script=/common/utils.js
// META: script=resources/ba-fledge-util.sub.js
// META: script=resources/fledge-util.sub.js
// META: script=third_party/cbor-js/cbor.js
// META: script=/common/subset-tests.js
// META: timeout=long
// META: variant=?1-4
// META: variant=?5-8
// META: variant=?9-12
// META: variant=?13-16
// META: variant=?17-20
// META: variant=?21-24
// META: variant=?25-28
// META: variant=?29-32
// META: variant=?33-36
// META: variant=?37-40

// These tests focus on the serverResponse field in AuctinConfig, e.g.
// auctions involving bidding and auction services.

subsetTest(promise_test, async test => {
  const uuid = generateUuid(test);
  const adA = createTrackerURL(window.location.origin, uuid, 'track_get', 'a');
  const adB = createTrackerURL(window.location.origin, uuid, 'track_get', 'b');
  const adsArray =
      [{renderURL: adA, adRenderId: 'a'}, {renderURL: adB, adRenderId: 'b'}];
  await joinInterestGroup(test, uuid, {ads: adsArray});

  const result = await navigator.getInterestGroupAdAuctionData(
      {seller: window.location.origin});
  assert_true(result.requestId !== null);
  assert_true(result.request.length > 0);

  let decoded = await BA.decodeInterestGroupData(result.request);

  let serverResponseMsg = {
    'biddingGroups': {},
    'adRenderURL': adsArray[0].renderURL,
    'interestGroupName': DEFAULT_INTEREST_GROUP_NAME,
    'interestGroupOwner': window.location.origin,
  };
  serverResponseMsg.biddingGroups[window.location.origin] = [0];

  let serverResponse =
      await BA.encodeServerResponse(serverResponseMsg, decoded);

  let hashString = await BA.payloadHash(serverResponse);
  await BA.authorizeServerResponseHashes([hashString]);

  let auctionResult = await navigator.runAdAuction({
    'seller': window.location.origin,
    'requestId': result.requestId,
    'serverResponse': serverResponse,
    'resolveToConfig': true,
  });
  expectSuccess(auctionResult);
  createAndNavigateFencedFrame(test, auctionResult);
  await waitForObservedRequests(uuid, [adA]);
}, 'Basic B&A auction');

subsetTest(promise_test, async test => {
  const uuid = generateUuid(test);
  const adA = createTrackerURL(window.location.origin, uuid, 'track_get', 'a');
  const adB = createTrackerURL(window.location.origin, uuid, 'track_get', 'b');
  const adsArray =
      [{renderURL: adA, adRenderId: 'a'}, {renderURL: adB, adRenderId: 'b'}];
  await joinInterestGroup(test, uuid, {ads: adsArray});

  const result = await navigator.getInterestGroupAdAuctionData(
      {seller: window.location.origin});
  assert_true(result.requestId !== null);
  assert_true(result.request.length > 0);

  let decoded = await BA.decodeInterestGroupData(result.request);

  const trackSeller = createSellerReportURL(uuid);
  const trackBuyer = createBidderReportURL(uuid);
  let serverResponseMsg = {
    'biddingGroups': {},
    'adRenderURL': adsArray[1].renderURL,
    'interestGroupName': DEFAULT_INTEREST_GROUP_NAME,
    'interestGroupOwner': window.location.origin,
    'winReportingURLs': {
      'buyerReportingURLs': {'reportingURL': trackBuyer},
      'topLevelSellerReportingURLs': {'reportingURL': trackSeller}
    }
  };
  serverResponseMsg.biddingGroups[window.location.origin] = [0];

  let serverResponse =
      await BA.encodeServerResponse(serverResponseMsg, decoded);

  let hashString = await BA.payloadHash(serverResponse);
  await BA.authorizeServerResponseHashes([hashString]);

  let auctionResult = await navigator.runAdAuction({
    'seller': window.location.origin,
    'requestId': result.requestId,
    'serverResponse': serverResponse,
    'resolveToConfig': true,
  });
  expectSuccess(auctionResult);
  createAndNavigateFencedFrame(test, auctionResult);
  await waitForObservedRequests(uuid, [adB, trackBuyer, trackSeller]);
}, 'Basic B&A auction with reporting URLs');

subsetTest(promise_test, async test => {
  const uuid = generateUuid(test);
  const adA = createTrackerURL(window.location.origin, uuid, 'track_get', 'a');
  const adB = createTrackerURL(window.location.origin, uuid, 'track_get', 'b');
  const adsArray =
      [{renderURL: adA, adRenderId: 'a'}, {renderURL: adB, adRenderId: 'b'}];
  await joinInterestGroup(test, uuid, {
    ads: adsArray,
    biddingLogicURL: createBiddingScriptURL({allowComponentAuction: true})
  });

  const result = await navigator.getInterestGroupAdAuctionData(
      {seller: window.location.origin});
  assert_true(result.requestId !== null);
  assert_true(result.request.length > 0);

  let decoded = await BA.decodeInterestGroupData(result.request);

  // The server-side auction uses a bid of 10, for second ad, so it should
  // win over the client-side component auctions bid of 9.
  let serverResponseMsg = {
    'biddingGroups': {},
    'adRenderURL': adsArray[1].renderURL,
    'interestGroupName': DEFAULT_INTEREST_GROUP_NAME,
    'interestGroupOwner': window.location.origin,
    'topLevelSeller': window.location.origin,
    'bid': 10,
  };
  serverResponseMsg.biddingGroups[window.location.origin] = [0];

  let serverResponse =
      await BA.encodeServerResponse(serverResponseMsg, decoded);

  let hashString = await BA.payloadHash(serverResponse);
  await BA.authorizeServerResponseHashes([hashString]);

  let auctionConfig = {
    seller: window.location.origin,
    decisionLogicURL: createDecisionScriptURL(uuid),
    interestGroupBuyers: [],
    resolveToConfig: true,
    componentAuctions: [
      {
        seller: window.location.origin,
        decisionLogicURL: createDecisionScriptURL(uuid),
        interestGroupBuyers: [window.location.origin],
      },
      {
        seller: window.location.origin,
        requestId: result.requestId,
        serverResponse: serverResponse,
      }
    ]
  };

  let auctionResult = await navigator.runAdAuction(auctionConfig);
  expectSuccess(auctionResult);
  createAndNavigateFencedFrame(test, auctionResult);
  await waitForObservedRequests(uuid, [adB]);
}, 'Hybrid B&A auction');

subsetTest(promise_test, async test => {
  const uuid = generateUuid(test);
  const adA = createTrackerURL(window.location.origin, uuid, 'track_get', 'a');
  const adB = createTrackerURL(window.location.origin, uuid, 'track_get', 'b');
  const adsArray =
      [{renderURL: adA, adRenderId: 'a'}, {renderURL: adB, adRenderId: 'b'}];
  await joinInterestGroup(test, uuid, {
    ads: adsArray,
    biddingLogicURL: createBiddingScriptURL({allowComponentAuction: true})
  });

  const result = await navigator.getInterestGroupAdAuctionData(
      {seller: window.location.origin});
  assert_true(result.requestId !== null);
  assert_true(result.request.length > 0);

  let decoded = await BA.decodeInterestGroupData(result.request);

  // The server-side auction uses a bid of 10, for second ad, so it should
  // win over the client-side component auctions bid of 9.
  const trackServerSeller = createSellerReportURL(uuid);
  const trackBuyer = createBidderReportURL(uuid);
  let serverResponseMsg = {
    'biddingGroups': {},
    'adRenderURL': adsArray[1].renderURL,
    'interestGroupName': DEFAULT_INTEREST_GROUP_NAME,
    'interestGroupOwner': window.location.origin,
    'topLevelSeller': window.location.origin,
    'bid': 10,
    'winReportingURLs': {
      'buyerReportingURLs': {'reportingURL': trackBuyer},
      'componentSellerReportingURLs': {'reportingURL': trackServerSeller}
    }
  };
  serverResponseMsg.biddingGroups[window.location.origin] = [0];

  let serverResponse =
      await BA.encodeServerResponse(serverResponseMsg, decoded);

  let hashString = await BA.payloadHash(serverResponse);
  await BA.authorizeServerResponseHashes([hashString]);

  let trackTopSeller = createSellerReportURL(uuid, 'top');
  let trackClientSeller = createSellerReportURL(uuid, 'client');
  let auctionConfig = {
    seller: window.location.origin,
    decisionLogicURL: createDecisionScriptURL(
        uuid, {reportResult: `sendReportTo("${trackTopSeller}")`}),
    interestGroupBuyers: [],
    resolveToConfig: true,
    componentAuctions: [
      {
        seller: window.location.origin,
        decisionLogicURL: createDecisionScriptURL(
            uuid, {reportResult: `sendReportTo("${trackClientSeller}")`}),
        interestGroupBuyers: [window.location.origin],
      },
      {
        seller: window.location.origin,
        requestId: result.requestId,
        serverResponse: serverResponse,
      }
    ]
  };

  let auctionResult = await navigator.runAdAuction(auctionConfig);
  expectSuccess(auctionResult);
  createAndNavigateFencedFrame(test, auctionResult);
  await waitForObservedRequests(
      uuid, [adB, trackBuyer, trackServerSeller, trackTopSeller]);
}, 'Hybrid B&A auction with reporting URLs');

async function runFaultInjectTest(test, fault) {
  const uuid = generateUuid(test);
  const adA = 'https://example.org/a';
  const adB = 'https://example.org/b';
  const adsArray =
      [{renderURL: adA, adRenderId: 'a'}, {renderURL: adB, adRenderId: 'b'}];
  await joinInterestGroup(test, uuid, {ads: adsArray});

  const result = await navigator.getInterestGroupAdAuctionData(
      {seller: window.location.origin});
  assert_true(result.requestId !== null);
  assert_true(result.request.length > 0);

  let decoded = await BA.decodeInterestGroupData(result.request);

  let serverResponseMsg = {
    'biddingGroups': {},
    'adRenderURL': adsArray[0].renderURL,
    'interestGroupName': DEFAULT_INTEREST_GROUP_NAME,
    'interestGroupOwner': window.location.origin,
  };
  serverResponseMsg.biddingGroups[window.location.origin] = [0];

  let serverResponse =
      await BA.encodeServerResponse(serverResponseMsg, decoded, fault);

  let hashString = await BA.payloadHash(serverResponse);
  await BA.authorizeServerResponseHashes([hashString]);

  let auctionResult = await navigator.runAdAuction({
    'seller': window.location.origin,
    'requestId': result.requestId,
    'serverResponse': serverResponse,
    'resolveToConfig': true,
  });
  expectNoWinner(auctionResult);
}

subsetTest(promise_test, async test => {
  return runFaultInjectTest(test, BA.injectCborFault);
}, 'Basic B&A auction - fault inject at CBOR');

subsetTest(promise_test, async test => {
  return runFaultInjectTest(test, BA.injectGzipFault);
}, 'Basic B&A auction - fault inject at gzip');

subsetTest(promise_test, async test => {
  return runFaultInjectTest(test, BA.injectFrameFault);
}, 'Basic B&A auction - fault inject at framing');

subsetTest(promise_test, async test => {
  return runFaultInjectTest(test, BA.injectEncryptFault);
}, 'Basic B&A auction - fault inject at encryption');

subsetTest(promise_test, async test => {
  const uuid = generateUuid(test);
  const adA = 'https://example.org/a';
  const adB = 'https://example.org/b';
  const adsArray =
      [{renderURL: adA, adRenderId: 'a'}, {renderURL: adB, adRenderId: 'b'}];
  await joinInterestGroup(test, uuid, {ads: adsArray});

  const result = await navigator.getInterestGroupAdAuctionData(
      {seller: window.location.origin});
  assert_true(result.requestId !== null);
  assert_true(result.request.length > 0);

  let decoded = await BA.decodeInterestGroupData(result.request);

  let serverResponseMsg = {
    'biddingGroups': {},
    'adRenderURL': adsArray[0].renderURL,
    'interestGroupName': DEFAULT_INTEREST_GROUP_NAME,
    'interestGroupOwner': window.location.origin,
  };
  serverResponseMsg.biddingGroups[window.location.origin] = [0];

  let serverResponse =
      await BA.encodeServerResponse(serverResponseMsg, decoded);

  // Mess up the array for a bit before computing hash to get the wrong hash,
  // then undo.
  serverResponse[0] ^= 0xBE;
  let hashString = await BA.payloadHash(serverResponse);
  await BA.authorizeServerResponseHashes([hashString]);
  serverResponse[0] ^= 0xBE;

  let auctionResult = await navigator.runAdAuction({
    'seller': window.location.origin,
    'requestId': result.requestId,
    'serverResponse': serverResponse,
    'resolveToConfig': true,
  });
  expectNoWinner(auctionResult);
}, 'Basic B&A auction - Wrong authorization');

subsetTest(promise_test, async test => {
  const uuid = generateUuid(test);
  const adA = 'https://example.org/a';
  const adB = 'https://example.org/b';
  const adsArray =
      [{renderURL: adA, adRenderId: 'a'}, {renderURL: adB, adRenderId: 'b'}];
  await joinInterestGroup(test, uuid, {ads: adsArray});

  const result =
      await navigator.getInterestGroupAdAuctionData({seller: OTHER_ORIGIN1});
  assert_true(result.requestId !== null);
  assert_true(result.request.length > 0);

  let decoded = await BA.decodeInterestGroupData(result.request);

  let serverResponseMsg = {
    'biddingGroups': {},
    'adRenderURL': adsArray[0].renderURL,
    'interestGroupName': DEFAULT_INTEREST_GROUP_NAME,
    'interestGroupOwner': window.location.origin,
  };
  serverResponseMsg.biddingGroups[window.location.origin] = [0];

  let serverResponse =
      await BA.encodeServerResponse(serverResponseMsg, decoded);

  let hashString = await BA.payloadHash(serverResponse);
  await BA.authorizeServerResponseHashes([hashString]);

  let auctionResult = await navigator.runAdAuction({
    'seller': window.location.origin,
    'requestId': result.requestId,
    'serverResponse': serverResponse,
    'resolveToConfig': true,
  });
  expectNoWinner(auctionResult);
}, 'Basic B&A auction - Wrong seller');

subsetTest(promise_test, async test => {
  const uuid = generateUuid(test);
  const adA = 'https://example.org/a';
  const adB = 'https://example.org/b';
  const adsArray =
      [{renderURL: adA, adRenderId: 'a'}, {renderURL: adB, adRenderId: 'b'}];
  await joinInterestGroup(test, uuid, {ads: adsArray});

  const result = await navigator.getInterestGroupAdAuctionData(
      {seller: window.location.origin});
  assert_true(result.requestId !== null);
  assert_true(result.request.length > 0);

  let decoded = await BA.decodeInterestGroupData(result.request);

  let serverResponseMsg = {
    'biddingGroups': {},
    'adRenderURL': adsArray[0].renderURL,
    'interestGroupName': DEFAULT_INTEREST_GROUP_NAME,
    'interestGroupOwner': window.location.origin,
  };
  serverResponseMsg.biddingGroups[window.location.origin] = [0];

  let serverResponse =
      await BA.encodeServerResponse(serverResponseMsg, decoded);

  let hashString = await BA.payloadHash(serverResponse);
  await BA.authorizeServerResponseHashes([hashString]);

  let auctionResult = await navigator.runAdAuction({
    'seller': window.location.origin,
    'requestId': token(),
    'serverResponse': serverResponse,
    'resolveToConfig': true,
  });
  expectNoWinner(auctionResult);
}, 'Basic B&A auction - Wrong request Id');

// Runs responseMutator on a minimal correct server response, and expects
// either success/failure based on expectWin.
async function testWithMutatedServerResponse(test, expectWin, responseMutator,
                                             igMutator = undefined) {
  const uuid = generateUuid(test);
  const adA = createTrackerURL(window.location.origin, uuid, 'track_get', 'a');
  const adB = createTrackerURL(window.location.origin, uuid, 'track_get', 'b');
  const adsArray =
      [{renderURL: adA, adRenderId: 'a'}, {renderURL: adB, adRenderId: 'b'}];
  let ig = {ads: adsArray};
  if (igMutator) {
    igMutator(ig);
  }
  await joinInterestGroup(test, uuid, ig);

  const result = await navigator.getInterestGroupAdAuctionData(
      {seller: window.location.origin});
  assert_true(result.requestId !== null);
  assert_true(result.request.length > 0);

  let decoded = await BA.decodeInterestGroupData(result.request);

  let serverResponseMsg = {
    'biddingGroups': {},
    'adRenderURL': adsArray[0].renderURL,
    'interestGroupName': DEFAULT_INTEREST_GROUP_NAME,
    'interestGroupOwner': window.location.origin,
  };
  serverResponseMsg.biddingGroups[window.location.origin] = [0];
  await responseMutator(serverResponseMsg);

  let serverResponse =
      await BA.encodeServerResponse(serverResponseMsg, decoded);

  let hashString = await BA.payloadHash(serverResponse);
  await BA.authorizeServerResponseHashes([hashString]);

  let auctionResult = await navigator.runAdAuction({
    'seller': window.location.origin,
    'interestGroupBuyers': [window.location.origin],
    'requestId': result.requestId,
    'serverResponse': serverResponse,
    'resolveToConfig': true,
  });
  if (expectWin) {
    expectSuccess(auctionResult);
    return auctionResult;
  } else {
    expectNoWinner(auctionResult);
  }
}

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(
      test, /*expectSuccess=*/ false, msg => {msg.error = {}});
}, 'Basic B&A auction - response marked as error');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(test, /*expectSuccess=*/ true, msg => {
    msg.error = 4;
  });
}, 'Basic B&A auction - nonsense error field');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(test, /*expectSuccess=*/ false, msg => {
    msg.error = {message: 'oh no'};
  });
}, 'Basic B&A auction - response marked as error, with message');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(test, /*expectSuccess=*/ false, msg => {
    msg.error = {message: {}};
  });
}, 'Basic B&A auction - response marked as error, with bad message');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(
      test, /*expectSuccess=*/ false, msg => {msg.isChaff = true});
}, 'Basic B&A auction - response marked as chaff');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(
      test, /*expectSuccess=*/ true, msg => {msg.isChaff = false});
}, 'Basic B&A auction - response marked as non-chaff');

// Disabled while spec clarifying expected behavior is in-progress.
//
// subsetTest(promise_test, async test => {
//   await testWithMutatedServerResponse(
//       test, /*expectSuccess=*/ true, msg => {msg.isChaff = 'yes'});
// }, 'Basic B&A auction - response marked as chaff incorrectly');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(
      test, /*expectSuccess=*/ false,
      msg => {msg.topLevelSeller = 'https://example.org/'});
}, 'Basic B&A auction - incorrectly includes topLevelSeller');

// Disabled while spec clarifying expected behavior is in-progress.
//
// subsetTest(promise_test, async test => {
//   await testWithMutatedServerResponse(
//       test, /*expectSuccess=*/ true, msg => {msg.topLevelSeller = 1});
// }, 'Basic B&A auction - non-string top-level seller ignored');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(
      test, /*expectSuccess=*/ false,
      msg => {msg.topLevelSeller = 'http://example.org/'});
}, 'Basic B&A auction - http:// topLevelSeller is bad, too');

// Disabled while spec clarifying expected behavior is in-progress.
//
// subsetTest(promise_test, async test => {
//   await testWithMutatedServerResponse(
//       test, /*expectSuccess=*/ true, msg => {msg.bid = '10 cents'});
// }, 'Basic B&A auction - non-number bid is ignored');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(
      test, /*expectSuccess=*/ true, msg => {msg.bid = 50});
}, 'Basic B&A auction - positive bid is good');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(
      test, /*expectSuccess=*/ false, msg => {msg.bid = -50});
}, 'Basic B&A auction - negative bid is bad');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(
      test, /*expectSuccess=*/ false, msg => {msg.bid = 0});
}, 'Basic B&A auction - zero bid is bad');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(
      test, /*expectSuccess=*/ false,
      msg => {msg.biddingGroups[window.location.origin] = []});
}, 'Basic B&A auction - winning group did not bid');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(
      test, /*expectSuccess=*/ false,
      msg => {msg.biddingGroups[window.location.origin] = [-1, 0]});
}, 'Basic B&A auction - negative bidding group index');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(
      test, /*expectSuccess=*/ false,
      msg => {msg.biddingGroups[window.location.origin] = [0, 1]});
}, 'Basic B&A auction - too large bidding group index');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(test, /*expectSuccess=*/ false, msg => {
    msg.interestGroupName += 'not';
  });
}, 'Basic B&A auction - wrong IG name');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(
      test, /*expectSuccess=*/ false, async msg => {
        await leaveInterestGroup();
      });
}, 'Basic B&A auction - left IG in the middle');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(test, /*expectSuccess=*/ false, msg => {
    msg.adRenderURL += 'not';
  });
}, 'Basic B&A auction - ad URL not in ad');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(test, /*expectSuccess=*/ false, msg => {
    msg.buyerReportingId = 'bid1';
  });
}, 'Basic B&A auction - buyerReportingId not in ad');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(test, /*expectSuccess=*/ true, msg => {
    msg.buyerReportingId = 'bid1';
  }, ig => {
    ig.ads[0].buyerReportingId = 'bid1';
    ig.ads[1].buyerReportingId = 'bid2';
  });
}, 'Basic B&A auction - buyerReportingId in ad');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(test, /*expectSuccess=*/ false, msg => {
    msg.buyerReportingId = 'bid2';
  }, ig => {
    ig.ads[0].buyerReportingId = 'bid1';
    ig.ads[1].buyerReportingId = 'bid2';
  });
}, 'Basic B&A auction - buyerReportingId in wrong ad');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(test, /*expectSuccess=*/ false, msg => {
    msg.buyerAndSellerReportingId = 'bsid1';
  });
}, 'Basic B&A auction - buyerAndSellerReportingId not in ad');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(test, /*expectSuccess=*/ true, msg => {
    msg.buyerAndSellerReportingId = 'bsid1';
  }, ig => {
    ig.ads[0].buyerAndSellerReportingId = 'bsid1';
    ig.ads[1].buyerAndSellerReportingId = 'bsid2';
  });
}, 'Basic B&A auction - buyerAndSellerReportingId in ad');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(test, /*expectSuccess=*/ false, msg => {
    msg.buyerAndSellerReportingId = 'bsid2';
  }, ig => {
    ig.ads[0].buyerAndSellerReportingId = 'bsid1';
    ig.ads[1].buyerAndSellerReportingId = 'bsid2';
  });
}, 'Basic B&A auction - buyerAndSellerReportingId in wrong ad');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(test, /*expectSuccess=*/ false, msg => {
    msg.components = ["https://example.org"];
  });
}, 'Basic B&A auction - ad component URL not in ad');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(test, /*expectSuccess=*/ true, msg => {
    msg.components = ['https://example.org'];
  }, ig => {
    ig.adComponents = [{renderURL: 'https://example.org/'}];
  });
}, 'Basic B&A auction - ad component URL in ad');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(test, /*expectSuccess=*/ false, msg => {
    msg.bidCurrency = 'cents';
  });
}, 'Basic B&A auction - invalid ad currency');

subsetTest(promise_test, async test => {
  await testWithMutatedServerResponse(test, /*expectSuccess=*/ true, msg => {
    msg.bidCurrency = 'USD';
  });
}, 'Basic B&A auction - valid ad currency');

/* Some things that are not currently tested that probably should be; this is
   not exhaustive, merely to keep track of things that come to mind as tests are
   written:

   - Need multi-seller to notice values of bid/bidCurrency.

   - Reporting event/beacon operation.

   - Actually loading component ad --- see stuff in components-ads.https...
     for examples.
*/
