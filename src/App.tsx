import { useEffect, useState } from "react";
import { assessBorrower } from "./domain/borrower/engine.js";
import type { AssessmentResult, MonetaryRange } from "./domain/borrower/types.js";
import {
  getNextQuestion, getVisibleQuestions, toAssessmentInput,
  type FlowAnswer, type FlowAnswers, type QuestionDefinition
} from "./application/borrowerFlow.js";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("en-IN", { style: "percent", maximumFractionDigits: 1 });

function formatMoney(value: MonetaryRange | null): string {
  if (!value) return "Not available yet";
  return value.low === value.high ? money.format(value.low) : `${money.format(value.low)} - ${money.format(value.high)}`;
}

function formatRate(low: number, high: number): string {
  return low === high ? percent.format(low) : `${percent.format(low)} - ${percent.format(high)}`;
}

function formatApr(assessment: AssessmentResult): string {
  if (assessment.apr.apr) return formatRate(assessment.apr.apr.low, assessment.apr.apr.high);
  return "Cannot be calculated yet";
}

const productLabels: Record<AssessmentResult["negotiationCard"]["product"], string> = {
  personalLoan: "Personal loan",
  businessLoan: "Business loan",
  loanAgainstProperty: "Loan against property",
  goldLoan: "Gold loan",
  twoWheelerLoan: "Two-wheeler loan"
};

function parseNonNegativeNumber(raw: string): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

function labelForAnswer(answer: FlowAnswer | undefined): string {
  if (answer === undefined) return "Not answered";
  if (typeof answer === "boolean") return answer ? "Yes" : "No";
  if (typeof answer === "string") return answer;
  if ("kind" in answer) {
    if (answer.kind === "unknown") return "Unknown";
    return answer.kind === "known" ? money.format(answer.value) : `${money.format(answer.low)} - ${money.format(answer.high)}`;
  }
  if ("status" in answer) return answer.status === "known" ? "Score known" : answer.status === "noHistory" ? "No known history" : "Unknown";
  return answer.rateType === "floating" ? "Floating rate" : answer.rateType === "fixed" ? `Fixed rate, ${answer.preferredTenureMonths.kind === "known" ? answer.preferredTenureMonths.value : "unknown"} months` : "Terms undecided";
}

function App() {
  const [screen, setScreen] = useState<"intro" | "questions" | "review" | "results">("intro");
  const [answers, setAnswers] = useState<FlowAnswers>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [numericDraft, setNumericDraft] = useState("");
  const [numericHighDraft, setNumericHighDraft] = useState("");
  const [creditScoreDraft, setCreditScoreDraft] = useState("");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  const visibleQuestions = getVisibleQuestions(answers);
  const currentQuestion = visibleQuestions[questionIndex] ?? null;
  const nextQuestion = getNextQuestion(answers);
  const completed = visibleQuestions.length > 0 && visibleQuestions.every((question) => answers[question.id] !== undefined);
  const progress = visibleQuestions.length === 0 ? 0 : Math.min(100, Math.round(((questionIndex + (completed ? 1 : 0)) / visibleQuestions.length) * 100));

  function startAssessment() {
    setAnswers({});
    setQuestionIndex(0);
    setAssessment(null);
    setNumericDraft("");
    setNumericHighDraft("");
    setCreditScoreDraft("");
    setSubmissionError(null);
    setInputError(null);
    setScreen("questions");
  }

  function saveAnswer(answer: FlowAnswer) {
    if (!currentQuestion) return;
    const nextAnswers = { ...answers, [currentQuestion.id]: answer };
    setAnswers(nextAnswers);
    setInputError(null);
    if (currentQuestion.id === "creditProfile" && typeof answer === "object" && answer !== null && "status" in answer && answer.status === "known" && answer.score.kind === "unknown") return;
    const nextVisibleQuestions = getVisibleQuestions(nextAnswers);
    const nextIndex = nextVisibleQuestions.findIndex((question, index) => index > questionIndex && nextAnswers[question.id] === undefined);
    if (nextIndex >= 0) setQuestionIndex(nextIndex);
  }

  function commitCurrentAnswer() {
    if (!currentQuestion) return;
    const isNumeric = currentQuestion.inputType === "money" || currentQuestion.inputType === "range" || currentQuestion.inputType === "percentage";
    if (isNumeric) {
      if (numericDraft.trim() === "") return;
      const low = parseNonNegativeNumber(numericDraft);
      if (low === null) {
        setInputError("Enter a valid number, or choose I don't know this yet.");
        return;
      }
      if (currentQuestion.inputType === "range" && numericHighDraft.trim() !== "") {
        const high = parseNonNegativeNumber(numericHighDraft);
        if (high === null) {
          setInputError("Enter a valid maximum, or leave it blank.");
          return;
        }
        saveAnswer({ kind: "range", low: Math.min(low, high), high: Math.max(low, high) });
      } else {
        const value = currentQuestion.inputType === "percentage" ? low / 100 : low;
        saveAnswer({ kind: "known", value });
      }
      return;
    }
    if (currentQuestion.id === "creditProfile" && creditScoreDraft.trim() !== "") {
      const score = parseNonNegativeNumber(creditScoreDraft);
      if (score === null) {
        setInputError("Enter a valid credit score, or say you do not know it.");
        return;
      }
      saveAnswer({ status: "known", score: { kind: "known", value: score } });
      return;
    }
    if (answers[currentQuestion.id] !== undefined) {
      setQuestionIndex((current) => Math.min(current + 1, visibleQuestions.length - 1));
    }
  }

  function goBack() {
    if (questionIndex > 0) setQuestionIndex((current) => current - 1);
    else setScreen("intro");
  }

  function openReview() {
    setSubmissionError(null);
    setScreen("review");
  }

  function submit() {
    const input = toAssessmentInput(answers);
    if (!input) {
      setSubmissionError("Please resolve the required income type and loan purpose before we calculate your assessment. You can choose an answer or edit the relevant row above. A not-decided repayment term is okay.");
      return;
    }
    setAssessment(assessBorrower(input));
    setScreen("results");
  }

  if (screen === "intro") return <IntroScreen onStart={startAssessment} />;
  if (screen === "review") return <ReviewScreen answers={answers} questions={visibleQuestions} submissionError={submissionError} onBack={() => setScreen("questions")} onEdit={(index) => { setSubmissionError(null); setQuestionIndex(index); setScreen("questions"); }} onSubmit={submit} />;
  if (screen === "results" && assessment) return <ResultsScreen assessment={assessment} onRestart={startAssessment} />;
  if (!currentQuestion) return <EmptyState onRestart={startAssessment} />;

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand-button" onClick={() => setScreen("intro")} aria-label="Return to introduction">Borrower <span>Copilot</span></button>
        <span className="privacy-note">Private by design</span>
      </header>
      <section className="flow-panel" aria-live="polite">
        <div className="progress-row">
          <span>Question {questionIndex + 1} of {visibleQuestions.length}</span>
          <span>{progress}% complete</span>
        </div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
        <QuestionCard question={currentQuestion} value={answers[currentQuestion.id]} numericDraft={numericDraft} numericHighDraft={numericHighDraft} creditScoreDraft={creditScoreDraft} onNumericDraftChange={setNumericDraft} onNumericHighDraftChange={setNumericHighDraft} onCreditScoreDraftChange={setCreditScoreDraft} onAnswer={saveAnswer} />
        {inputError ? <p className="input-error" role="alert">{inputError}</p> : null}
        <div className="flow-actions">
          <button className="text-button" onClick={goBack}>Back</button>
          {completed ? <button className="primary-button" onClick={openReview}>Review answers</button> : nextQuestion && answers[currentQuestion.id] !== undefined && currentQuestion.inputType !== "money" && currentQuestion.inputType !== "range" && currentQuestion.inputType !== "percentage" && currentQuestion.id !== "creditProfile" ? <button className="primary-button" onClick={() => setQuestionIndex((current) => Math.min(current + 1, visibleQuestions.length - 1))}>Continue</button> : null}
          {!completed && (((currentQuestion.inputType === "money" || currentQuestion.inputType === "range" || currentQuestion.inputType === "percentage") && numericDraft.trim() !== "") || (currentQuestion.id === "creditProfile" && creditScoreDraft.trim() !== "")) ? <button className="primary-button" onClick={commitCurrentAnswer}>Continue</button> : null}
        </div>
      </section>
    </main>
  );
}

function IntroScreen({ onStart }: { readonly onStart: () => void }) {
  return <main className="app-shell intro-shell">
    <header className="topbar"><div className="brand">Borrower <span>Copilot</span></div><span className="privacy-note">Private by design</span></header>
    <section className="intro-content">
      <div className="eyebrow">A clearer conversation with your lender</div>
      <h1>Borrow with a number you can live with.</h1>
      <p className="intro-copy">A short, borrower-first check of what you may be offered, what you can safely carry, and what to negotiate.</p>
      <div className="intro-points"><span><b>01</b> Safe affordability</span><span><b>02</b> Fair-rate range</span><span><b>03</b> Negotiation card</span></div>
      <button className="primary-button large-button" onClick={onStart}>Start my assessment <span aria-hidden="true">→</span></button>
      <p className="fine-print">No login. No bureau check. Your answers stay in this session.</p>
    </section>
  </main>;
}

function QuestionCard({ question, value, numericDraft, numericHighDraft, creditScoreDraft, onNumericDraftChange, onNumericHighDraftChange, onCreditScoreDraftChange, onAnswer }: { readonly question: QuestionDefinition; readonly value: FlowAnswer | undefined; readonly numericDraft: string; readonly numericHighDraft: string; readonly creditScoreDraft: string; readonly onNumericDraftChange: (value: string) => void; readonly onNumericHighDraftChange: (value: string) => void; readonly onCreditScoreDraftChange: (value: string) => void; readonly onAnswer: (answer: FlowAnswer) => void }) {
  const options = question.options ?? [];
  const isNumeric = question.inputType === "money" || question.inputType === "range" || question.inputType === "percentage";
  const currentNumeric = numericDraft;

  useEffect(() => {
    if (isNumeric && value && typeof value === "object" && "kind" in value && value.kind === "known") onNumericDraftChange(String(value.value));
    if (isNumeric && value && typeof value === "object" && "kind" in value && value.kind === "range") {
      onNumericDraftChange(String(value.low));
      onNumericHighDraftChange(String(value.high));
    }
    if (isNumeric && (!value || (typeof value === "object" && "kind" in value && value.kind === "unknown"))) onNumericDraftChange("");
    if (isNumeric && (!value || (typeof value === "object" && "kind" in value && value.kind === "unknown"))) onNumericHighDraftChange("");
    if (question.id === "creditProfile" && value && typeof value === "object" && "status" in value && value.status === "known" && "kind" in value.score && value.score.kind === "known") onCreditScoreDraftChange(String(value.score.value));
  }, [question.id, value, isNumeric, onNumericDraftChange]);

  return <div className="question-card">
    <div className="question-kicker">{question.requiredness === "core" ? "Core check" : "A little more context"}</div>
    <h1>{question.text}</h1>
    <p className="question-why">{question.whyWeAsk}</p>
    {isNumeric ? <div className="numeric-answer">
      <label htmlFor={question.id}>{question.inputType === "range" ? "Enter a minimum and optional maximum" : question.inputType === "percentage" ? "Annual rate as a percentage" : "Amount in rupees"}</label>
      <div className="range-inputs"><div className="input-wrap"><span>{question.inputType === "percentage" ? "%" : "₹"}</span><input id={question.id} inputMode="decimal" type="number" min="0" step={question.inputType === "percentage" ? "0.01" : "1"} value={currentNumeric} placeholder={question.inputType === "percentage" ? "For example, 12" : "Minimum"} onChange={(event) => onNumericDraftChange(event.target.value)} /></div>{question.inputType === "range" ? <div className="input-wrap"><span>₹</span><input aria-label="Maximum amount in rupees" inputMode="numeric" type="number" min="0" value={numericHighDraft} placeholder="Maximum (optional)" onChange={(event) => onNumericHighDraftChange(event.target.value)} /></div> : null}</div>
      <button className={`unknown-button ${value && typeof value === "object" && "kind" in value && value.kind === "unknown" ? "selected" : ""}`} onClick={() => onAnswer({ kind: "unknown", reason: "Not provided" })}>I don't know this yet</button>
    </div> : <div className="option-list">
      {options.map((option, index) => <button className={`option-button ${sameAnswer(option.value, value) ? "selected" : ""}`} key={`${question.id}-${index}`} onClick={() => onAnswer(option.value)}>{option.label}<span aria-hidden="true">{sameAnswer(option.value, value) ? "✓" : "↗"}</span></button>)}
      {question.id === "creditProfile" && typeof value === "object" && value !== null && "status" in value && value.status === "known" ? <div className="score-input"><label htmlFor="credit-score">Credit score</label><div className="input-wrap"><input id="credit-score" inputMode="numeric" type="number" min="300" max="900" value={creditScoreDraft} placeholder="For example, 780" onChange={(event) => onCreditScoreDraftChange(event.target.value)} /></div><button className="unknown-button" onClick={() => onAnswer({ status: "unknown", score: { kind: "unknown", reason: "Score not provided" } })}>I know my history, but not the score</button></div> : null}
    </div>}
  </div>;
}

function sameAnswer(left: FlowAnswer, right: FlowAnswer | undefined): boolean {
  if (typeof left !== "object" || left === null || typeof right !== "object" || right === null) return left === right;
  return JSON.stringify(left) === JSON.stringify(right);
}

function ReviewScreen({ answers, questions, submissionError, onBack, onEdit, onSubmit }: { readonly answers: FlowAnswers; readonly questions: readonly QuestionDefinition[]; readonly submissionError: string | null; readonly onBack: () => void; readonly onEdit: (index: number) => void; readonly onSubmit: () => void }) {
  return <main className="app-shell"><header className="topbar"><div className="brand">Borrower <span>Copilot</span></div><span className="privacy-note">Review</span></header><section className="review-panel"><div className="eyebrow">Before we calculate</div><h1>Check your answers.</h1><p className="intro-copy">Unknown answers stay visible and will widen uncertainty rather than being treated as zero.</p>{submissionError ? <div className="submission-error" role="alert">{submissionError}</div> : null}<div className="answer-list">{questions.map((question, index) => <button className="answer-row" key={question.id} onClick={() => onEdit(index)}><span><small>{question.text}</small><strong>{labelForAnswer(answers[question.id])}</strong></span><span aria-hidden="true">Edit</span></button>)}</div><div className="flow-actions"><button className="text-button" onClick={onBack}>Back</button><button className="primary-button" onClick={onSubmit}>See my assessment</button></div></section></main>;
}

function ResultsScreen({ assessment, onRestart }: { readonly assessment: AssessmentResult; readonly onRestart: () => void }) {
  const verdictLabels = { borrow: "Borrowing may fit", borrowLess: "Consider borrowing less", dontBorrow: "Pause before borrowing", needsInformation: "More information needed" };
  const affordabilityReason = assessment.affordability.reasons.find((item) => item.id === "SAFE_EMI_EXPLAINED");
  const sanctionReason = assessment.eligibility.reasons.find((item) => item.id === "SANCTION_ESTIMATE");
  const rateReason = assessment.reasons.find((item) => item.output === "rate");
  const aprReason = assessment.apr.reasons[0];
  const unknowns = assessment.reasons.filter((item) => item.severity !== "info");
  const stressTitle = assessment.stress.passes === true ? "There is a buffer under stress" : assessment.stress.passes === false ? "The stress case does not pass" : "Stress check needs more information";
  const negotiationPoints = buildNegotiationPoints(assessment);
  const assumptions = buildAssumptions(assessment);
  const unknownMessages = uniqueMessages(unknowns.map((item) => item.message));
  return <main className="app-shell results-shell">
    <header className="topbar"><div className="brand">Borrower <span>Copilot</span></div><span className="confidence-chip">{assessment.confidence} confidence</span></header>
    <section className="results-content">
      <div className="eyebrow">Your borrower view</div>
      <h1>{verdictLabels[assessment.verdict]}</h1>
      <p className="result-lede">This is a decision aid, not a lender approval. Your safe number and a lender's possible number are different things.</p>
      <div className={`verdict-banner ${assessment.verdict}`}><div className="section-label">Recommendation</div><strong>{assessment.reasons.at(-1)?.message}</strong></div>

      <ResultSection eyebrow="Two different ceilings" title="What might be approved vs what feels safe">
        <div className="comparison-grid">
          <ResultNumber title="Likely lender sanction" value={formatMoney(assessment.eligibility.likelySanction)} explanation={sanctionReason?.message ?? "This estimate uses income, existing EMIs, product route and lender-cap assumptions."} tone="lender" />
          <ResultNumber title="Borrower-safe amount" value={formatMoney(assessment.affordability.safeBorrowing)} explanation={affordabilityReason?.message ?? "This ceiling protects essential expenses, existing EMIs and a monthly buffer."} tone="safe" />
        </div>
        <p className="use-this-number">Use the borrower-safe amount as your ceiling. The lender range is a possible sanction estimate, not a recommendation to borrow that much.</p>
      </ResultSection>

      <ResultSection eyebrow="Rate and cost" title="A fair range to negotiate">
        <div className="metric-grid compact-grid">
          <Metric title="Fair interest rate" value={formatRate(assessment.fairRate.low, assessment.fairRate.high)} detail={rateReason?.message ?? "This range reflects the available repayment and credit evidence."} />
          <Metric title="All-in APR" value={formatApr(assessment)} detail={aprReason?.message ?? "APR uses net disbursal and scheduled repayments."} />
          <Metric title="All-in borrowing cost" value={formatMoney(assessment.apr.allInCost)} detail={assessment.apr.allInCost ? "Total repayments minus net amount disbursed, including known fees." : "All-in cost cannot be calculated until the offered rate and mandatory fees are known."} />
        </div>
      </ResultSection>

      <ResultSection eyebrow="Monthly outflow" title="The EMI ceiling comes first">
        <div className="emi-highlight"><div className="section-label">Recommended maximum EMI</div><strong>{assessment.affordability.recommendedMaximumEmi === null ? "Not available" : money.format(assessment.affordability.recommendedMaximumEmi)}</strong><p>{affordabilityReason?.message ?? "A safe EMI needs complete income, expense, existing EMI and upcoming-obligation information."}</p></div>
        <div className="tenure-list"><div className="section-label">Tenure trade-offs</div>{assessment.tenureOptions.length === 0 ? <p className="muted-copy">Tenure comparisons need a safe amount and EMI ceiling.</p> : assessment.tenureOptions.map((option) => <div className="tenure-row" key={option.months}><span><strong>{option.months} months</strong><small>{money.format(option.emi)} / month</small></span><span className={option.passesSafety && option.passesStress ? "pass-label" : "caution-label"}>{option.passesSafety && option.passesStress ? "Fits safety" : "Review"}</span></div>)}</div>
      </ResultSection>

      <ResultSection eyebrow="Stress scenario" title={stressTitle}>
        <div className="stress-result"><strong>{assessment.stress.stressedMonthlySurplus ? formatMoney(assessment.stress.stressedMonthlySurplus) : "Not available"}</strong><span>stressed monthly surplus</span></div><p>{assessment.stress.reasons[0]?.message ?? "Stress affordability needs more information."}</p>
        <div className="scenario-tags">{assessment.stress.scenarios.length === 0 ? <span>Inputs incomplete</span> : assessment.stress.scenarios.map((scenario) => <span key={scenario}>{scenario} stress</span>)}</div>
      </ResultSection>

      <ResultSection eyebrow="Confidence and unknowns" title={`${assessment.confidence} confidence in this assessment`}>
        <p className="confidence-copy">Confidence reflects how complete the evidence is. It is not a credit score and does not mean approval.</p>
        {unknowns.length === 0 ? <p className="known-copy">No caution or blocking information was raised by the assessment.</p> : <div className="unknown-list">{unknowns.map((item) => <div key={item.id}><strong>{item.message}</strong><small>{item.inputReferences.join(" · ")}</small></div>)}</div>}
      </ResultSection>

      <section className="negotiation-card" id="negotiation-card"><div className="card-header"><div><div className="section-label">Negotiation card</div><h2>Take these numbers to the lender.</h2></div><div className="card-actions"><button className="card-action" onClick={() => window.print()}>Print / PDF</button><button className="card-action" onClick={() => shareNegotiationCard(assessment)}>Share</button></div></div><p className="card-intro">A concise borrower brief. Values marked modelled are estimates from your answers, not lender offers.</p><div className="modelled-label">Modelled borrower position</div><div className="negotiation-grid"><span>Product<strong>{productLabels[assessment.negotiationCard.product]}</strong></span><span>Requested amount<strong>{formatMoney(assessment.negotiationCard.requestedAmount)}</strong></span><span>Likely lender range<strong>{formatMoney(assessment.negotiationCard.likelyLenderSanction)}</strong></span><span>Recommended safe amount<strong>{formatMoney(assessment.negotiationCard.safeBorrowing)}</strong></span><span>Safe EMI ceiling<strong>{assessment.negotiationCard.recommendedMaximumEmi === null ? "Not available" : money.format(assessment.negotiationCard.recommendedMaximumEmi)}</strong></span><span>Fair rate range<strong>{formatRate(assessment.negotiationCard.fairRate.low, assessment.negotiationCard.fairRate.high)}</strong></span><span>All-in cost<strong>{formatMoney(assessment.apr.allInCost)}</strong></span><span>APR<strong>{formatApr(assessment)}</strong></span><span>Preferred tenure<strong>{assessment.negotiationCard.suggestedTenureMonths ? `${assessment.negotiationCard.suggestedTenureMonths} months` : "Not available"}</strong></span><span>Stress result<strong>{assessment.stress.passes === true ? "Passes" : assessment.stress.passes === false ? "Does not pass" : "Unknown"}</strong></span></div><div className="lender-boundary"><strong>Lender offer to confirm</strong><span>Ask the lender to provide the sanctioned amount, final rate, fees, APR, EMI, tenure, and any insurance or third-party charges in writing.</span></div><div className="card-columns"><CardList title="Key reasons" items={assessment.negotiationCard.keyReasons.slice(0, 4).map((item) => item.message)} /><CardList title="Ask for / negotiate" items={negotiationPoints} /><CardList title="Unknowns and cautions" items={unknownMessages.length > 0 ? unknownMessages : ["No additional caution was raised by the assessment."]} /><CardList title="Assumptions and limitations" items={assumptions} /></div><footer className="card-footer"><span>{assessment.confidence} confidence</span><span>Borrower decision aid, not lender approval</span></footer></section>
      <button className="secondary-button" onClick={onRestart}>Start a new assessment</button>
    </section>
  </main>;
}

function buildNegotiationPoints(assessment: AssessmentResult): readonly string[] {
  if (assessment.verdict === "dontBorrow") {
    return [
      "Do not add a new loan until existing repayment stress is resolved.",
      "If you still speak with a lender, request a complete written fee and APR schedule rather than a headline rate."
    ];
  }
  const points = ["Keep the new EMI at or below the recommended safe ceiling.", "Use the borrower-safe amount, not the likely lender-sanction range, as your borrowing ceiling."];
  if (assessment.fairRate.low > 0) points.push(`Ask whether the lender can offer a rate within ${formatRate(assessment.fairRate.low, assessment.fairRate.high)}.`);
  if (assessment.apr.status !== "estimated") points.push("Request the complete fee schedule before comparing APR or total cost.");
  if (assessment.negotiationCard.suggestedTenureMonths) points.push(`Compare the ${assessment.negotiationCard.suggestedTenureMonths}-month option against shorter tenures before accepting a lower EMI.`);
  return points;
}

function buildAssumptions(assessment: AssessmentResult): readonly string[] {
  const source = assessment.fairRate.sourceType === "market_observation" ? "The rate range uses a market observation and is not a lender quote." : "The rate range includes model assumptions and is not a lender quote.";
  const apr = assessment.apr.status === "estimated" ? "APR includes the known fees supplied to the assessment." : "APR is not estimated because complete lender fee information was not supplied.";
  return [source, apr, "The safe amount preserves the configured borrower-protection buffer and is not an approval prediction."];
}

function uniqueMessages(messages: readonly string[]): readonly string[] {
  return [...new Set(messages)];
}

async function shareNegotiationCard(assessment: AssessmentResult): Promise<"success" | "cancelled" | "error"> {
  const text = `Borrower Copilot negotiation card\nSafe amount: ${formatMoney(assessment.negotiationCard.safeBorrowing)}\nSafe EMI ceiling: ${assessment.negotiationCard.recommendedMaximumEmi === null ? "Not available" : money.format(assessment.negotiationCard.recommendedMaximumEmi)}\nFair rate: ${formatRate(assessment.negotiationCard.fairRate.low, assessment.negotiationCard.fairRate.high)}\nConfidence: ${assessment.confidence}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: "Borrower Copilot negotiation card", text });
      window.alert("Negotiation card shared.");
      return "success";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      window.alert("Negotiation card copied to clipboard.");
      return "success";
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (copied) {
      window.alert("Negotiation card copied to clipboard.");
      return "success";
    }
    window.alert("Sharing is unavailable. Use Print / PDF instead.");
    return "error";
  } catch {
    window.alert("Sharing is unavailable. Use Print / PDF instead.");
    return "error";
  }
}

function CardList({ title, items }: { readonly title: string; readonly items: readonly string[] }) {
  return <div className="card-list"><div className="card-list-title">{title}</div><ul>{items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ul></div>;
}

function ResultSection({ eyebrow, title, children }: { readonly eyebrow: string; readonly title: string; readonly children: React.ReactNode }) {
  return <section className="result-section"><div className="result-section-heading"><div className="section-label">{eyebrow}</div><h2>{title}</h2></div><div className="result-section-body">{children}</div></section>;
}

function ResultNumber({ title, value, explanation, tone }: { readonly title: string; readonly value: string; readonly explanation: string; readonly tone: "lender" | "safe" }) {
  return <article className={`result-number ${tone}`}><div className="section-label">{title}</div><strong>{value}</strong><p>{explanation}</p></article>;
}

function Metric({ title, value, detail }: { readonly title: string; readonly value: string; readonly detail: string }) {
  return <article className="metric-card"><div className="section-label">{title}</div><strong>{value}</strong><p>{detail}</p></article>;
}

function EmptyState({ onRestart }: { readonly onRestart: () => void }) {
  return <main className="app-shell empty-state"><h1>Let's start over.</h1><button className="primary-button" onClick={onRestart}>Start assessment</button></main>;
}

export default App;
