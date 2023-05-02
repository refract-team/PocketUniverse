import bypassImage from "data-base64:~assets/bypass.png";
import Navbar from "~components/Navbar";
import { usePostHog } from "posthog-js/react";

function Bypass() {
  const posthog = usePostHog();

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-800 text-gray-100">
      <div className="sticky top-0 z-50 w-full">
        <Navbar />
      </div>
      <div className="flex w-full grow flex-col">
        <div className="flex grow flex-col items-center justify-center gap-4 py-6 text-center text-base">
          <img src={bypassImage} className="h-60" alt="warning stop image" />
          <div className="px-8 font-bold text-red-500">
            This website skipped the Pocket Universe popup!
          </div>
          <div className="px-24 text-gray-100">
            It might be because you have another extension installed (e.g. Rabby) that is
            interfering or this website is dangerous.
          </div>{" "}
          <div>
            Please contact us on{" "}
            <a
              href="https://discord.com/invite/nVdz8tKkBr"
              target="_blank"
              onClick={() => {
                posthog?.capture("discord_click_bypass");
              }}
              className="inline text-base text-purple-300 hover:underline"
              rel="noreferrer">
              {" "}
              Discord{" "}
            </a>{" "}
            if you continue to see this issue!
          </div>
        </div>
        <div className="sticky bottom-0 bg-gray-900 px-2 py-5">
          <div className="flex items-center justify-center">
            <button
              type="button"
              className="mx-10 inline-flex h-11 w-28 items-center justify-center rounded rounded-lg border border-transparent bg-white text-base font-bold text-gray-900 drop-shadow-xl"
              onClick={async () => {
                posthog?.capture("bypass_dismiss");
                window.close();
              }}>
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Bypass;
