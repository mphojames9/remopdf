import { useEffect, useState } from 'react';

/*
  Whether the signed-in person has Premium, shared with parts of the page that sit far from the
  payment code (the AI writing assistant in every section of the builder).

    setPremiumAccess(true | false | null)   called by the builder whenever /api/payments/status answers
    usePremiumAccess()                      -> true | false | null
    requestUpgrade()                        asks the builder to open the payment dialog
    onUpgradeRequest(handler)               the builder registers here; returns an unsubscribe function

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
