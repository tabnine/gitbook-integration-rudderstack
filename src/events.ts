import * as api from '@gitbook/api';
import { AES, enc } from 'crypto-js';

import { version } from '../package.json';

const RUDDER_ANONYMOUS_ID_COOKIE_NAME = 'rl_anonymous_id';

/**
 * Generate the event to track in RudderStack for an actual GitBook event.
 */
export default function generateRudderStackTrackEvent(event: api.SpaceViewEvent) {
  const { visitor, referrer, url, spaceId, pageId } = event;

  const anonymousId = getAnonymousId(event);
  const visitedURL = new URL(url);
  return {
    event: 'GitBook Space Viewed',
    anonymousId,
    context: {
      library: {
        name: 'GitBook',
        version
      },
      page: {
        path: visitedURL.pathname,
        search: visitedURL.search,
        url,
        referrer
      },
      userAgent: visitor.userAgent,
      ip: visitor.ip
    },
    properties: {
      spaceId,
      pageId
    }
  };
}

/**
 * Return the anonymous ID we send to RudderStack in the Track event.
 *
 * Retrieve the value from the `rl_anonymous_id` RudderStack cookie if present.
 * This allows to consolidate the track event with other events generated by an anonymous user
 * that already has visited the customer website (where RudderStack tracking is setup).
 *
 * When there is no `rl_anonymous_id` cookie, we fallback to using the GitBook anonymous ID.
 */
function getAnonymousId(event: api.SpaceViewEvent): string {
  const { visitor } = event;
  const {cookies} = visitor;

  const extractedAnonymousId = extractAnonymousId(cookies);
  console.log('extracted anonymous id', extractedAnonymousId);
  return extractedAnonymousId || visitor.anonymousId;
}

function decrypt(urlDecodedCookieValue: string): string {
  return AES.decrypt(
    urlDecodedCookieValue.substring('RudderEncrypt:'.length),
    'Rudder'
  ).toString(enc.Utf8);
}

function extractAnonymousId(cookies: { [p: string]: string }): string {
  let anonymousId: string;

  if (cookies) {
    const rudderAnonymousId = cookies[RUDDER_ANONYMOUS_ID_COOKIE_NAME];
    if (rudderAnonymousId) {
      const decodedAnonymousId = decodeURIComponent(rudderAnonymousId);
      const decryptedId = decrypt(decodedAnonymousId);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      anonymousId = JSON.parse(decryptedId);
    }
  }

  return anonymousId;
}