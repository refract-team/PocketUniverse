import pending from "data-base64:~assets/pending.png";

import { Infographic } from "~components/Infographic";

/// Single Pending Transaction View
export function Pending() {
  return (
    <Infographic
      image={pending}
      alt="loading robot"
      title={<div> Simulating... </div>}
      description={
        <div>
          This should take about a second.
          <br />
          <br />
          Please contact us if this takes substantially longer for you!
        </div>
      }
    />
  );
}
