import "react-tooltip/dist/react-tooltip.css";

import Navbar from "~components/Navbar";
import { REQUEST_STORE_NAME } from "~utils/extension-store";
import { useStorage } from "@plasmohq/storage/hook";

import { Viewer } from "./Viewer";

export default function Simulate() {
  const [request] = useStorage({ key: REQUEST_STORE_NAME, area: "local" });

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-800 text-gray-100">
      <div className="sticky top-0 z-50 w-full">
        <Navbar chainId={request?.request?.chainId} />
      </div>
      <Viewer request={request} />
    </div>
  );
}
