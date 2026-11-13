import { useEffect, useState } from 'react';

/*
  Whether the signed-in person has Premium, shared with parts of the page that sit far from the
  payment code (the AI writing assistant in every section of the builder).

    setPremiumAccess(true | false | null)   called by the builder whenever /api/payments/status answers
    usePremiumAccess()                      -> true | false | null   (true = any paid plan: Plus, Pro or Max)
    setAccessTier('free' | 'plus' | 'pro' | 'max' | null)   the plan, called by the builder with the same answer
    useAccessTier()                         -> 'free' | 'plus' | 'pro' | 'max' | null   (null = not known yet)
    requestUpgrade()                        asks the builder to open the payment dialog
    onUpgradeRequest(handler)               the builder registers here; returns an unsubscribe function

    setSignedIn(true | false | null)        called by the builder whenever the signed-in account changes
    useSignedIn()                           -> true | false | null   (null = not known yet)
    requestSignIn()                         asks the builder to open the sign-in dialog
    onSignInRequest(handler)                the builder registers here; returns an unsubscribe function

  Locked parts of the page say "Sign in" to someone who is signed out, and "Upgrade to Premium" to someone
  who is signed in without Premium: paying needs an account, so signing in comes first.

  null means "not known yet". Nothing here grants anything: the server checks Premium again on every AI
  request, so this only decides what the page shows and whether it bothers to ask.
*/

let access = null;
const listeners = new Set();

export const setPremiumAccess = (value) => {
  const next = value === true ? true : value === false ? false : null;
  if (next === access) return;
  access = next;
  listeners.forEach((listener) => listener(next));
};

export const getPremiumAccess = () => access;

// The plan itself. Premium (above) only says "has paid for something"; this says which of the three paid plans.
const TIER_NAMES = ['free', 'plus', 'pro', 'max'];
let tier = null;
const tierListeners = new Set();

export const setAccessTier = (value) => {
  const next = TIER_NAMES.includes(value) ? value : null;
  if (next === tier) return;
  tier = next;
  tierListeners.forEach((listener) => listener(next));
};

export const getAccessTier = () => tier;

export function useAccessTier() {
  const [value, setValue] = useState(tier);
  useEffect(() => {
    setValue(tier); // it may have changed between the first render and this effect
    tierListeners.add(setValue);
    return () => {
      tierListeners.delete(setValue);
    };
  }, []);
  return value;
}

export function usePremiumAccess() {
  const [value, setValue] = useState(access);
  useEffect(() => {
    setValue(access); // it may have changed between the first render and this effect
    listeners.add(setValue);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}

const upgradeHandlers = new Set();

export const onUpgradeRequest = (handler) => {
  upgradeHandlers.add(handler);
  return () => {
    upgradeHandlers.delete(handler);
  };
};

export const requestUpgrade = () => {
  upgradeHandlers.forEach((handler) => handler());
};

let signedIn = null;
const signedInListeners = new Set();

export const setSignedIn = (value) => {
  const next = value === true ? true : value === false ? false : null;
  if (next === signedIn) return;
  signedIn = next;
  signedInListeners.forEach((listener) => listener(next));
};

export function useSignedIn() {
  const [value, setValue] = useState(signedIn);
  useEffect(() => {
    setValue(signedIn); // it may have changed between the first render and this effect
    signedInListeners.add(setValue);
    return () => {
      signedInListeners.delete(setValue);
    };
  }, []);
  return value;
}

const signInHandlers = new Set();

export const onSignInRequest = (handler) => {
  signInHandlers.add(handler);
  return () => {
    signInHandlers.delete(handler);
  };
};

export const requestSignIn = () => {
  signInHandlers.forEach((handler) => handler());
};
