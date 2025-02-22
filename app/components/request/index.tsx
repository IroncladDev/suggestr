import { useState } from "react";
import "./request.css";
import { Invoice, Suggestion } from "@prisma/client";
import { requestPostUpfront } from "@/app/server/actions";
import RequestMessage from "./message";
import RequestConfirm from "./confirm";
import RequestInvoice from "./invoice";
import RequestNWCUri from "./nwc-uri";

export default function RequestForm() {
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState("");
  const [nostrPubKey, setNostrPubKey] = useState("");
  const [nwcUri, setNwcUri] = useState("");
  const [additionalAmount, setAdditionalAmount] = useState(1000);
  const [suggestion, setSuggestion] = useState<
    (Suggestion & { upfrontInvoice: Invoice }) | null
  >(null);

  const onFinish = () => {
    setStep(0)
    setMessage("")
    setNostrPubKey("")
    setNwcUri("")
    setAdditionalAmount(1000)
    setSuggestion(null)
  }

  const handleSubmit = async () => {
    const res = await requestPostUpfront({
      content: message,
      pubKey: nostrPubKey,
      nwc: nwcUri,
      additionalAmount,
    });

    if (res.success) {
      setSuggestion(res.suggestion);
      setStep(step + 1);
    } else {
      alert(res.message);
    }
  };

  return (
    <div id="request-form">
      <div id="request-content">
        {step === 0 && (
          <RequestMessage
            message={message}
            setMessage={setMessage}
            nostrPubKey={nostrPubKey}
            setNostrPubKey={setNostrPubKey}
            setStep={setStep}
          />
        )}
        {step === 1 && (
          <RequestNWCUri
            nwcUri={nwcUri}
            setNwcUri={setNwcUri}
            setStep={setStep}
          />
        )}
        {step === 2 && (
          <RequestConfirm
            additionalAmount={additionalAmount}
            setAdditionalAmount={setAdditionalAmount}
            handleSubmit={handleSubmit}
            setStep={setStep}
          />
        )}
        {step === 3 && <RequestInvoice suggestion={suggestion} onFinish={onFinish} />}
      </div>
      <div id="bottom-tabs">
        <BottomTab index={0} isActive={step === 0} name="post" />
        <BottomTab index={1} isActive={step === 1} name="nwc" />
        <BottomTab index={2} isActive={step === 2} name="confirm" />
        <BottomTab index={4} isActive={step === 3} name="payment" />
      </div>
    </div>
  );
}

function BottomTab({
  index,
  isActive,
  name,
}: {
  index: number;
  isActive: boolean;
  name: string;
}) {
  return (
    <div className={isActive ? "active tab" : "tab"}>
      <div className={isActive ? "indicator" : ""}>{index}</div>
      <span>{name}</span>
    </div>
  );
}
