import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PhantomWalletName } from "@solana/wallet-adapter-phantom";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { NETWORK_NAME, shorten } from "../lib/config";
import { clearWalletError, logWalletError, reportWalletError, useWalletError } from "../lib/walletErrors";

const WAS_CONNECTED = "tb-wallet-was-connected";
let restoreTried = false; // module-level so React StrictMode's double effect cannot connect twice

/** Header wallet control driven entirely by real wallet-adapter state (no simulation). */
export default function WalletStatus() {
  const { wallet, publicKey, connected, connecting, disconnecting, select, connect, disconnect } = useWallet();
  const hasError = useWalletError();
  const [wantConnect, setWantConnect] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notInstalled, setNotInstalled] = useState(false);
  const attempted = useRef(false);

  // After Phantom is selected, call connect() once so the Phantom popup opens.
  useEffect(() => {
    if (!wantConnect || connected || connecting) return;
    if (wallet?.adapter.name !== PhantomWalletName || attempted.current) return;
    attempted.current = true;
    connect()
      .catch(reportWalletError)
      .finally(() => setWantConnect(false));
  }, [wantConnect, wallet, connected, connecting, connect]);

  // Silent reconnect after a refresh, only if this browser connected before. Errors stay in the console.
  useEffect(() => {
    if (restoreTried || connected || wallet?.adapter.name !== PhantomWalletName) return;
    if (localStorage.getItem(WAS_CONNECTED) !== "1") return;
    restoreTried = true;
    connect().catch((e) => {
      logWalletError(e);
      localStorage.removeItem(WAS_CONNECTED);
    });
  }, [wallet, connected, connect]);

  useEffect(() => {
    if (connected) {
      localStorage.setItem(WAS_CONNECTED, "1");
      clearWalletError();
      setNotInstalled(false);
      setWantConnect(false);
    }
  }, [connected]);

  function handleConnect() {
    clearWalletError();
    setNotInstalled(false);
    if (wallet && wallet.readyState === WalletReadyState.NotDetected) {
      setNotInstalled(true);
      return;
    }
    attempted.current = false;
    if (wallet?.adapter.name !== PhantomWalletName) select(PhantomWalletName);
    setWantConnect(true);
  }

  async function copy() {
    if (!publicKey) return;
    try {
      await navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable on non-secure origins */
    }
  }

  const address = publicKey?.toBase58();

  return (
    <div className="wallet">
      {connected && address ? (
        <div className="wallet-box">
          <div className="wallet-id" title={address}>
            <span className="dot ok-dot" aria-hidden />
            <div>
              <div className="wallet-line">
                <strong>Wallet Connected</strong>
              </div>
              <div className="mono small">{shorten(address, 4)} · {NETWORK_NAME}</div>
            </div>
          </div>
          <button className="btn-quiet" onClick={copy} aria-label="Copy full wallet address">
            {copied ? "Copied" : "Copy"}
          </button>
          <button className="btn-quiet" onClick={() => { localStorage.removeItem(WAS_CONNECTED); disconnect().catch(logWalletError); }} disabled={disconnecting}>
            {disconnecting ? "…" : "Disconnect"}
          </button>
        </div>
      ) : (
        <button className="btn-connect" onClick={handleConnect} disabled={connecting || wantConnect}>
          {connecting || wantConnect ? "Connecting..." : "Connect Phantom"}
        </button>
      )}

      {!connected && (hasError || notInstalled) && (
        <div className="wallet-error" role="alert">
          <strong>Unable to connect Phantom.</strong>
          <span>Make sure:</span>
          <ul>
            <li>Phantom is installed{" "}
              <a href="https://phantom.app/download" target="_blank" rel="noreferrer">(get Phantom)</a>
            </li>
            <li>Phantom is unlocked</li>
            <li>Phantom is set to Devnet</li>
          </ul>
          <button className="btn-quiet" onClick={() => { clearWalletError(); setNotInstalled(false); }}>Dismiss</button>
        </div>
      )}
    </div>
  );
}
