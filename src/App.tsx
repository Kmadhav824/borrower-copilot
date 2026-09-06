import { useEffect, useState } from "react";
import { assessBorrower } from "./domain/borrower/engine.js";
import type { AssessmentResult, MonetaryRange, NumericInput } from "./domain/borrower/types.js";
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
    setScreen("questions");
  }

  function saveAnswer(answer: FlowAnswer) {
    if (!currentQuestion) return;
    setAnswers((current) => ({ ...current, [currentQuestion.id]: answer }));
    if (questionIndex < visibleQuestions.length - 1) setQuestionIndex((current) => current + 1);
  }

  function commitCurrentAnswer() {
    if (!currentQuestion) return;
    const isNumeric = currentQuestion.inputType === "money" || currentQuestion.inputType === "range";
    if (isNumeric) {
      if (numericDraft.trim() === "") return;
      saveAnswer({ kind: "known", value: Number(numericDraft) });
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
    setScreen("review");
  }

  function submit() {
    const input = toAssessmentInput(answers);
    if (!input) return;
    setAssessment(assessBorrower(input));
    setScreen("results");
  }

  if (screen === "intro") return <IntroScreen onStart={startAssessment} />;
  if (screen === "review") return <ReviewScreen answers={answers} questions={visibleQuestions} onBack={() => setScreen("questions")} onEdit={(index) => { setQuestionIndex(index); setScreen("questions"); }} onSubmit={submit} />;
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
        <QuestionCard question={currentQuestion} value={answers[currentQuestion.id]} numericDraft={numericDraft} onNumericDraftChange={setNumericDraft} onAnswer={saveAnswer} />
        <div className="flow-actions">
          <button className="text-button" onClick={goBack}>Back</button>
          {completed ? <button className="primary-button" onClick={openReview}>Review answers</button> : nextQuestion && answers[currentQuestion.id] !== undefined ? <button className="primary-button" onClick={() => setQuestionIndex((current) => Math.min(current + 1, visibleQuestions.length - 1))}>Continue</button> : null}
          {!completed && ((currentQuestion.inputType === "money" || currentQuestion.inputType === "range") && numericDraft.trim() !== "") ? <button className="primary-button" onClick={commitCurrentAnswer}>Continue</button> : null}
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

function QuestionCard({ question, value, numericDraft, onNumericDraftChange, onAnswer }: { readonly question: QuestionDefinition; readonly value: FlowAnswer | undefined; readonly numericDraft: string; readonly onNumericDraftChange: (value: string) => void; readonly onAnswer: (answer: FlowAnswer) => void }) {
  const options = question.options ?? [];
  const isNumeric = question.inputType === "money" || question.inputType === "range";
  const currentNumeric = numericDraft;

  useEffect(() => {
    if (isNumeric && value && typeof value === "object" && "kind" in value && value.kind === "known") onNumericDraftChange(String(value.value));
    if (isNumeric && (!value || (typeof value === "object" && "kind" in value && value.kind === "unknown"))) onNumericDraftChange("");
  }, [question.id, value, isNumeric, onNumericDraftChange]);

  return <div className="question-card">
    <div className="question-kicker">{question.requiredness === "core" ? "Core check" : "A little more context"}</div>
    <h1>{question.text}</h1>
    <p className="question-why">{question.whyWeAsk}</p>
    {isNumeric ? <div className="numeric-answer">
      <label htmlFor={question.id}>Amount in rupees</label>
      <div className="input-wrap"><span>₹</span><input id={question.id} inputMode="numeric" type="number" min="0" value={currentNumeric} placeholder="Enter an amount" onChange={(event) => onNumericDraftChange(event.target.value)} /></div>
      <button className={`unknown-button ${value && typeof value === "object" && "kind" in value && value.kind === "unknown" ? "selected" : ""}`} onClick={() => onAnswer({ kind: "unknown", reason: "Not provided" })}>I don't know this yet</button>
    </div> : <div className="option-list">
      {options.map((option, index) => <button className={`option-button ${sameAnswer(option.value, value) ? "selected" : ""}`} key={`${question.id}-${index}`} onClick={() => onAnswer(option.value)}>{option.label}<span aria-hidden="true">{sameAnswer(option.value, value) ? "✓" : "↗"}</span></button>)}
    </div>}
  </div>;
}

function sameAnswer(left: FlowAnswer, right: FlowAnswer | undefined): boolean {
  if (typeof left !== "object" || left === null || typeof right !== "object" || right === null) return left === right;
  return JSON.stringify(left) === JSON.stringify(right);
}

function ReviewScreen({ answers, questions, onBack, onEdit, onSubmit }: { readonly answers: FlowAnswers; readonly questions: readonly QuestionDefinition[]; readonly onBack: () => void; readonly onEdit: (index: number) => void; readonly onSubmit: () => void }) {
  return <main className="app-shell"><header className="topbar"><div className="brand">Borrower <span>Copilot</span></div><span className="privacy-note">Review</span></header><section className="review-panel"><div className="eyebrow">Before we calculate</div><h1>Check your answers.</h1><p className="intro-copy">Unknown answers stay visible and will widen uncertainty rather than being treated as zero.</p><div className="answer-list">{questions.map((question, index) => <button className="answer-row" key={question.id} onClick={() => onEdit(index)}><span><small>{question.text}</small><strong>{labelForAnswer(answers[question.id])}</strong></span><span aria-hidden="true">Edit</span></button>)}</div><div className="flow-actions"><button className="text-button" onClick={onBack}>Back</button><button className="primary-button" onClick={onSubmit}>See my assessment</button></div></section></main>;
}

function ResultsScreen({ assessment, onRestart }: { readonly assessment: AssessmentResult; readonly onRestart: () => void }) {
  const verdictLabels = { borrow: "Borrowing may fit", borrowLess: "Consider borrowing less", dontBorrow: "Pause before borrowing", needsInformation: "More information needed" };
  return <main className="app-shell results-shell"><header className="topbar"><div className="brand">Borrower <span>Copilot</span></div><span className="confidence-chip">{assessment.confidence} confidence</span></header><section className="results-content"><div className="eyebrow">Your borrower view</div><h1>{verdictLabels[assessment.verdict]}</h1><p className="result-lede">This is a decision aid, not a lender approval. Your safe number and a lender's possible number are different things.</p><div className={`verdict-banner ${assessment.verdict}`}><strong>{assessment.reasons.at(-1)?.message}</strong></div><div className="metric-grid"><Metric title="Safe amount" value={formatMoney(assessment.affordability.safeBorrowing)} detail="A conservative amount to use as your ceiling." /><Metric title="Likely lender range" value={formatMoney(assessment.eligibility.likelySanction)} detail="What a lender might consider, not a recommendation." /><Metric title="Recommended max EMI" value={assessment.affordability.recommendedMaximumEmi === null ? "Not available" : money.format(assessment.affordability.recommendedMaximumEmi)} detail="Based on income, expenses, existing EMIs and commitments." /><Metric title="Fair rate range" value={formatRate(assessment.fairRate.low, assessment.fairRate.high)} detail="A negotiation range, not a guaranteed offer." /></div><section className="result-section"><div><div className="section-label">Stress check</div><h2>{assessment.stress.passes === true ? "There is a buffer under stress" : assessment.stress.passes === false ? "The stress case does not pass" : "Stress check needs more information"}</h2></div><p>{assessment.stress.reasons[0]?.message}</p></section><section className="result-section card-section"><div><div className="section-label">Negotiation card</div><h2>Take these numbers to the lender.</h2></div><div className="negotiation-grid"><span>Product<strong>{assessment.negotiationCard.product}</strong></span><span>Suggested tenure<strong>{assessment.negotiationCard.suggestedTenureMonths ? `${assessment.negotiationCard.suggestedTenureMonths} months` : "Not available"}</strong></span><span>All-in cost<strong>{formatMoney(assessment.apr.allInCost)}</strong></span><span>APR<strong>{assessment.apr.apr ? formatRate(assessment.apr.apr.low, assessment.apr.apr.high) : "Rate-only view"}</strong></span></div></section><button className="secondary-button" onClick={onRestart}>Start a new assessment</button></section></main>;
}

function Metric({ title, value, detail }: { readonly title: string; readonly value: string; readonly detail: string }) {
  return <article className="metric-card"><div className="section-label">{title}</div><strong>{value}</strong><p>{detail}</p></article>;
}

function EmptyState({ onRestart }: { readonly onRestart: () => void }) {
  return <main className="app-shell empty-state"><h1>Let's start over.</h1><button className="primary-button" onClick={onRestart}>Start assessment</button></main>;
}

export default App;
