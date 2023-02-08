import React from 'react';
import posthog from 'posthog-js';
import mixpanel from 'mixpanel-browser';

posthog.init('phc_P3MaeD52tbh7D1zIZv8zPZCqOZrZ5F1Zn4xNlV5KIRL', {
  api_host: 'https://app.posthog.com',
  autocapture: false,
  capture_pageview: false,
});

mixpanel.init('8989bf9bf536a55479ad0b467a2c3b2c', {
  persistence: 'localStorage',
  api_host: 'https://cloudrun.pocketuniverse.app',
  ignore_dnt: true,
});

const Bypass = () => {
  return (
    <div className="flex min-h-screen min-w-[400px] flex-col items-center overflow-hidden bg-gray-900 text-white">
      <div className="flex w-full flex-row p-4 text-center">
        <div className="flex flex-row gap-4 rounded-lg text-xl font-medium leading-6 text-purple-300">
          <img src="icon-128.png" className="my-auto h-10" alt="logo" />
          <div className="my-auto text-xl font-light">Pocket Universe</div>
        </div>
      </div>

      <div className="flex w-full grow flex-col">
        <div>
          <img
            className="w-full border-t border-gray-600"
            src="waves_top.png "
            alt=""
          />
        </div>

        <div className="flex w-full grow items-center justify-center">
          <div className="flex w-11/12 grow flex-col items-center justify-center">
            <img className="w-48" src="bypass.png" alt="bypass warning" />
            <div className="p-4 text-center text-lg font-bold text-red-500">
              🚨 WARNING 🚨
            </div>
            <div className="p-2 text-center text-base text-red-500">
              <div>This website is trying to bypass our security checks!</div>
              <div>
                {' '}
                Do not sign anything in your MetaMask, it may be a scam.{' '}
              </div>
            </div>
            <div className="p-2 text-center text-base text-gray-300">
              <div>Contact us if you think this was a mistake.</div>
            </div>
          </div>
        </div>
        <div className="flex flex-row justify-center space-x-16 p-4">
          <button
            className="w-48 rounded-full bg-gray-100 py-2 text-base text-black hover:bg-gray-300"
            onClick={async () => {
              posthog.capture('bypass detected');
              mixpanel.track('bypass detected');
              window.close();
            }}
          >
            Close
          </button>
        </div>
        <div>
          <img className="mt-auto w-full" src="waves_bottom.png" alt="" />
        </div>
      </div>
    </div>
  );
};

export default Bypass;
