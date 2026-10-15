import React, { useState, useEffect, useRef, type FC } from 'react';
import type { Language, LocationOption } from '../types';
import { translations } from '../data/i18n';
import {
  FlaskConical,
  ShieldAlert,
  CheckSquare,
  AlertTriangle,
  Volume2,
  Camera,
  Mic,
  ExternalLink,
  PhoneCall,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Flag,
  HelpCircle,
  X,
} from 'lucide-react';
import { getPesticideRepository } from '../pesticides';
import type {
  CropItem,
  CropProblem,
  GrowthStage,
  SoilType,
  SprayAdvisoryResult,
  CandidateDiagnosisItem,
  SprayWeatherAlert,
} from '../pesticides/types';
import { getSprayWeatherAlert } from '../services/sprayWeatherService';

interface PesticideDosageViewProps {
  currentLang: Language;
  currentLocation?: LocationOption;
}

export const PesticideDosageView: FC<PesticideDosageViewProps> = ({
  currentLang,
  currentLocation,
}) => {
  const t = translations[currentLang];
  const repo = getPesticideRepository();

  // Core Inputs
  const [cropsList, setCropsList] = useState<CropItem[]>([]);
  const [selectedCropId, setSelectedCropId] = useState<string>('chilli');
  const [selectedStage, setSelectedStage] = useState<GrowthStage | ''>('vegetative');
  const [selectedSoil, setSelectedSoil] = useState<SoilType | ''>('red');
  const [problemTab, setProblemTab] = useState<'common' | 'voice' | 'photo'>('common');
  const [selectedProblemId, setSelectedProblemId] = useState<string>('thrips');
  const [symptomText, setSymptomText] = useState<string>('');
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);

  // Pump & Acreage & Mode
  const [tankLiters, setTankLiters] = useState<number>(15);
  const [acreArea, setAcreArea] = useState<number>(1);
  const [chemicalType, setChemicalType] = useState<'chemical' | 'organic'>('chemical');

  // Photo Screening State
  const [isDiagnosingPhoto, setIsDiagnosingPhoto] = useState<boolean>(false);
  const [photoCandidates, setPhotoCandidates] = useState<CandidateDiagnosisItem[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Advisory Result State
  const [isLoadingRec, setIsLoadingRec] = useState<boolean>(false);
  const [advisoryResult, setAdvisoryResult] = useState<SprayAdvisoryResult | null>(null);
  const [whyDoseExpanded, setWhyDoseExpanded] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Weather Advisory State
  const [weatherAlert, setWeatherAlert] = useState<SprayWeatherAlert | null>(null);

  // Report Modal State
  const [reportModalOpen, setReportModalOpen] = useState<boolean>(false);
  const [reportedIssue, setReportedIssue] = useState<string>('');
  const [reportSubmitted, setReportSubmitted] = useState<boolean>(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);

  // 1. Load Crop Catalog on Mount
  useEffect(() => {
    let isMounted = true;
    repo.getCropList().then((crops) => {
      if (isMounted && crops.length > 0) {
        setCropsList(crops);
        const chilli = crops.find((c) => c.id === 'chilli') || crops[0];
        setSelectedCropId(chilli.id);
        if (chilli.defaultSoil) setSelectedSoil(chilli.defaultSoil);
        if (chilli.problems.length > 0) setSelectedProblemId(chilli.problems[0].id);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch Weather Advisory on Location Change
  useEffect(() => {
    let isMounted = true;
    getSprayWeatherAlert(currentLocation).then((alert) => {
      if (isMounted) setWeatherAlert(alert);
    });
    return () => {
      isMounted = false;
    };
  }, [currentLocation]);

  // Current crop object
  const currentCrop = cropsList.find((c) => c.id === selectedCropId) || cropsList[0];
  const currentProblems: CropProblem[] = currentCrop?.problems || [];

  // 3. Handle Crop Switch
  const handleSelectCrop = (cropId: string) => {
    setSelectedCropId(cropId);
    const crop = cropsList.find((c) => c.id === cropId);
    if (crop?.defaultSoil) setSelectedSoil(crop.defaultSoil);
    if (crop && crop.problems.length > 0) {
      setSelectedProblemId(crop.problems[0].id);
    }
    setPhotoCandidates([]);
    setPhotoPreview(null);
  };

  // 4. Recommendation Dispatch (triggers when inputs change)
  useEffect(() => {
    let isMounted = true;
    if (!selectedCropId || !selectedProblemId) return;

    setIsLoadingRec(true);
    repo
      .getSprayRecommendation({
        crop: selectedCropId,
        stage: selectedStage || undefined,
        soil: selectedSoil || undefined,
        problem: selectedProblemId,
        mode: chemicalType,
        pumpSizeL: tankLiters,
        acres: acreArea,
        state: currentLocation?.state?.en || 'Andhra Pradesh',
        district: currentLocation?.district?.en || 'Guntur',
      })
      .then((res) => {
        if (isMounted) {
          setAdvisoryResult(res);
          setIsLoadingRec(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAdvisoryResult(null);
          setIsLoadingRec(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [
    selectedCropId,
    selectedProblemId,
    selectedStage,
    selectedSoil,
    chemicalType,
    tankLiters,
    acreArea,
    currentLocation,
  ]);

  // 5. Voice Input Handler (SpeechRecognition)
  const handleStartVoiceRecognition = () => {
    if (typeof window === 'undefined') return;
    const win = window as any;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        currentLang === 'hi'
          ? 'आपके ब्राउज़र में वॉइस पहचान समर्थित नहीं है।'
          : currentLang === 'te'
          ? 'మీ బ్రౌజర్ వాయిస్ రికగ్నిషన్‌ను సపోర్ట్ చేయదు.'
          : 'Voice speech recognition is not supported in this browser.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = currentLang === 'hi' ? 'hi-IN' : currentLang === 'te' ? 'te-IN' : 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsRecordingVoice(true);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSymptomText(transcript);
        setIsRecordingVoice(false);

        // Check if transcript matches any known problem
        const lower = transcript.toLowerCase();
        const matched = currentProblems.find((p) => {
          const enMatch = p.name.en.toLowerCase();
          const hiMatch = p.name.hi.toLowerCase();
          const teMatch = p.name.te.toLowerCase();
          return (
            lower.includes(p.id) ||
            lower.includes(enMatch) ||
            lower.includes(hiMatch) ||
            lower.includes(teMatch)
          );
        });

        if (matched) {
          setSelectedProblemId(matched.id);
        } else {
          setSelectedProblemId(transcript.trim());
        }
      };

      recognition.onerror = () => {
        setIsRecordingVoice(false);
      };

      recognition.onend = () => {
        setIsRecordingVoice(false);
      };

      recognition.start();
    } catch {
      setIsRecordingVoice(false);
    }
  };

  // 6. Photo Upload & Gemini Vision Candidate Screening
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setPhotoPreview(base64);
      setIsDiagnosingPhoto(true);
      try {
        const candidates = await repo.diagnosePhoto(base64, selectedCropId);
        setPhotoCandidates(candidates);
      } catch {
        setPhotoCandidates([]);
      } finally {
        setIsDiagnosingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Farmer must confirm candidate from photo
  const handleConfirmCandidate = (candidate: CandidateDiagnosisItem) => {
    // Match candidate name to problem list or set problem ID
    const matched = currentProblems.find(
      (p) =>
        p.id.toLowerCase() === candidate.problem_name.toLowerCase() ||
        p.name.en.toLowerCase().includes(candidate.problem_name.toLowerCase()) ||
        candidate.problem_name.toLowerCase().includes(p.name.en.toLowerCase())
    );

    if (matched) {
      setSelectedProblemId(matched.id);
    } else {
      setSelectedProblemId(candidate.problem_name.toLowerCase().replace(/\s+/g, '_'));
    }
    setProblemTab('common');
  };

  // 7. TTS Audio Read-Aloud
  const handleReadAloud = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }

    let speechText = '';
    if (advisoryResult?.abstain) {
      speechText =
        currentLang === 'hi'
          ? 'इस समस्या के लिए कोई आधिकारिक सत्यापित खुराक नहीं मिली। कृपया 1800-180-1551 पर किसान कॉल सेंटर से सलाह लें।'
          : currentLang === 'te'
          ? 'ఈ సమస్యకు ధృవీకరించిన అధికారిక మోతాదు లభించలేదు. దయచేసి 1800-180-1551 లో కిసాన్ కాల్ సెంటర్‌ను సంప్రదించండి.'
          : 'No verified official recommendation found. Please contact the Kisan Call Centre at 1800-180-1551.';
    } else if (advisoryResult?.recommendation && advisoryResult.sprayPlan) {
      const rec = advisoryResult.recommendation;
      const plan = advisoryResult.sprayPlan;
      speechText =
        currentLang === 'hi'
          ? `अनुशंसित दवा: ${rec.product} ${rec.formulation}। प्रति ${tankLiters} लीटर टंकी में ${plan.chemicalPerTank} मिलाएं। ${acreArea} एकड़ के लिए कुल ${plan.totalPumps} पंप और कुल ${plan.totalChemicalQty} दवा लगेगी। स्प्रे करते समय मास्क और दस्ताने अवश्य पहनें।`
          : currentLang === 'te'
          ? `సిఫార్సు చేసిన మందు: ${rec.product} ${rec.formulation}. ప్రతి ${tankLiters} లీటర్ల ట్యాంకుకు ${plan.chemicalPerTank} కలపండి. మొత్తం ${plan.totalPumps} పంపులు, ${plan.totalChemicalQty} మందు అవసరం.`
          : `Recommended product: ${rec.product} ${rec.formulation}. Dose per ${tankLiters} liter tank is ${plan.chemicalPerTank}. Total pumps needed: ${plan.totalPumps}. Total quantity: ${plan.totalChemicalQty}. Follow product label instructions.`;
    }

    if (!speechText) return;

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = currentLang === 'hi' ? 'hi-IN' : currentLang === 'te' ? 'te-IN' : 'en-IN';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // 8. Submit Report Handler
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportedIssue.trim()) return;
    setIsSubmittingReport(true);
    try {
      await repo.reportWrongRecommendation({
        crop: selectedCropId,
        problem: selectedProblemId,
        mode: chemicalType,
        reportedIssue: reportedIssue.trim(),
      });
      setReportSubmitted(true);
      setTimeout(() => {
        setReportModalOpen(false);
        setReportSubmitted(false);
        setReportedIssue('');
      }, 2000);
    } catch {
      alert('Error submitting report. Please try again.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <div className="pesticide-dosage-container">
      {/* Header Strip */}
      <div className="view-header-strip">
        <div className="title-row">
          <FlaskConical size={24} className="view-icon" />
          <h2 className="view-title">
            {t.pesticideTitle} {currentLocation ? `(${currentLocation.name[currentLang]})` : ''}
          </h2>
        </div>
        {currentLocation && (
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
            📍 {currentLocation.name[currentLang]} ({currentLocation.district[currentLang]},{' '}
            {currentLocation.state[currentLang]})
          </p>
        )}
      </div>

      {/* Weather Risk / Spray Caution Ribbon */}
      {weatherAlert ? (
        <div
          className="pesticide-weather-caution-ribbon"
          style={{
            background: weatherAlert.severity === 'warning' ? '#FEF2F2' : '#F0FDF4',
            borderColor: weatherAlert.severity === 'warning' ? '#FECACA' : '#BBF7D0',
            color: weatherAlert.severity === 'warning' ? '#991B1B' : '#166534',
          }}
        >
          <AlertTriangle
            size={20}
            className="caution-icon"
            style={{ color: weatherAlert.severity === 'warning' ? '#DC2626' : '#16A34A' }}
          />
          <div className="caution-text">
            <strong>{weatherAlert.title[currentLang] || weatherAlert.title.en}</strong>
            <span> {weatherAlert.description[currentLang] || weatherAlert.description.en}</span>
            <div style={{ fontSize: 11, marginTop: 4, opacity: 0.9 }}>
              ⏱️ {weatherAlert.suggestedWindow[currentLang] || weatherAlert.suggestedWindow.en}
            </div>
          </div>
        </div>
      ) : (
        <div className="pesticide-weather-caution-ribbon">
          <AlertTriangle size={20} className="caution-icon" />
          <div className="caution-text">
            <strong>
              {currentLang === 'hi'
                ? `गुरुवार ${currentLocation?.name[currentLang] || ''} बारिश चेतावनी:`
                : currentLang === 'te'
                ? `గురువారం ${currentLocation?.name[currentLang] || ''} వర్షం హెచ్చరిక:`
                : `Thursday ${currentLocation?.name[currentLang] || ''} Rain Spray Advisory:`}
            </strong>
            <span>
              {currentLang === 'hi'
                ? ' गुरुवार को भारी बारिश संभावित है। बुधवार-गुरुवार को छिड़काव से बचें अन्यथा दवा बह जाएगी।'
                : currentLang === 'te'
                ? ' గురువారం భారీ వర్షం కురిసే అవకాశం ఉంది. బుధ-గురువారాల్లో పిచికారీ నివారించండి.'
                : ' Heavy rain expected on Thursday. Avoid spraying on Wed/Thu as chemicals will wash away.'}
            </span>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="pesticide-grid">
        {/* Left Column: Full Configurator */}
        <div className="dosage-calc-card">
          {/* 1. Crop Selector */}
          <div className="form-group">
            <label className="form-label" style={{ fontWeight: 700 }}>
              {t.selectCropLabel}
            </label>
            <div className="crop-picker-grid">
              {cropsList.map((crop) => (
                <button
                  key={crop.id}
                  type="button"
                  onClick={() => handleSelectCrop(crop.id)}
                  className={`crop-card-pill ${selectedCropId === crop.id ? 'active' : ''}`}
                >
                  <span className="c-icon">{crop.icon}</span>
                  <span className="c-name">{crop.name[currentLang] || crop.name.en}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Growth Stage (Optional) */}
          <div className="form-group" style={{ marginTop: 14 }}>
            <label className="form-label">{t.growthStageLabel}</label>
            <div className="growth-stage-pills">
              {(['seedling', 'vegetative', 'flowering', 'fruiting'] as GrowthStage[]).map(
                (stage) => (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => setSelectedStage(selectedStage === stage ? '' : stage)}
                    className={`stage-pill ${selectedStage === stage ? 'active' : ''}`}
                  >
                    {stage === 'seedling'
                      ? currentLang === 'hi'
                        ? 'अंकुरण (Seedling)'
                        : currentLang === 'te'
                        ? 'మొలక దశ'
                        : 'Seedling'
                      : stage === 'vegetative'
                      ? currentLang === 'hi'
                        ? 'वानस्पतिक (Vegetative)'
                        : currentLang === 'te'
                        ? 'శాఖీయ దశ'
                        : 'Vegetative'
                      : stage === 'flowering'
                      ? currentLang === 'hi'
                        ? 'फूल आने पर (Flowering)'
                        : currentLang === 'te'
                        ? 'పూత దశ'
                        : 'Flowering'
                      : currentLang === 'hi'
                      ? 'फल/दाना (Fruiting)'
                      : currentLang === 'te'
                      ? 'కాయ/గింజ దశ'
                      : 'Fruiting'}
                  </button>
                )
              )}
            </div>
          </div>

          {/* 3. Soil Type (Optional) */}
          <div className="form-group" style={{ marginTop: 14 }}>
            <label className="form-label">{t.soilTypeLabel}</label>
            <div className="soil-type-pills">
              {(['red', 'black', 'sandy', 'loamy', 'clay', 'alluvial'] as SoilType[]).map(
                (soil) => (
                  <button
                    key={soil}
                    type="button"
                    onClick={() => setSelectedSoil(selectedSoil === soil ? '' : soil)}
                    className={`soil-pill ${selectedSoil === soil ? 'active' : ''}`}
                  >
                    {soil === 'red'
                      ? currentLang === 'hi'
                        ? 'लाल मिट्टी (Red)'
                        : currentLang === 'te'
                        ? 'ఎర్ర నేలలు'
                        : 'Red Soil'
                      : soil === 'black'
                      ? currentLang === 'hi'
                        ? 'काली मिट्टी (Black)'
                        : currentLang === 'te'
                        ? 'నల్ల రేగడి'
                        : 'Black Soil'
                      : soil === 'sandy'
                      ? currentLang === 'hi'
                        ? 'बलुई (Sandy)'
                        : currentLang === 'te'
                        ? 'ఇసుక నేలలు'
                        : 'Sandy Soil'
                      : soil === 'loamy'
                      ? currentLang === 'hi'
                        ? 'दोमट (Loamy)'
                        : currentLang === 'te'
                        ? 'వరి నేలలు'
                        : 'Loamy Soil'
                      : soil === 'clay'
                      ? currentLang === 'hi'
                        ? 'चिकनी मिट्टी (Clay)'
                        : currentLang === 'te'
                        ? 'బంకమట్టి'
                        : 'Clay Soil'
                      : currentLang === 'hi'
                      ? 'जलोढ़ (Alluvial)'
                      : currentLang === 'te'
                      ? 'ఒండ్రు నేలలు'
                      : 'Alluvial Soil'}
                  </button>
                )
              )}
            </div>
          </div>

          {/* 4. Problem Selector (3 Ways) */}
          <div
            className="form-group"
            style={{
              marginTop: 18,
              borderTop: '1px solid #E2E8F0',
              paddingTop: 14,
            }}
          >
            <label className="form-label" style={{ fontWeight: 700, fontSize: 13 }}>
              {t.problemSectionTitle}
            </label>

            {/* Problem Navigation Tabs */}
            <div className="problem-method-tabs">
              <button
                type="button"
                onClick={() => setProblemTab('common')}
                className={`p-tab-btn ${problemTab === 'common' ? 'active' : ''}`}
              >
                <span>📋</span>
                <span>{t.commonProblemsTab}</span>
              </button>
              <button
                type="button"
                onClick={() => setProblemTab('voice')}
                className={`p-tab-btn ${problemTab === 'voice' ? 'active' : ''}`}
              >
                <span>🎙️</span>
                <span>{t.voiceSymptomsTab}</span>
              </button>
              <button
                type="button"
                onClick={() => setProblemTab('photo')}
                className={`p-tab-btn ${problemTab === 'photo' ? 'active' : ''}`}
              >
                <span>📷</span>
                <span>{t.photoDoctorTab}</span>
              </button>
            </div>

            {/* TAB A: Pick from Common Problems */}
            {problemTab === 'common' && (
              <div className="problem-chips-grid">
                {currentProblems.map((prob) => (
                  <button
                    key={prob.id}
                    type="button"
                    onClick={() => setSelectedProblemId(prob.id)}
                    className={`problem-chip ${selectedProblemId === prob.id ? 'active' : ''}`}
                  >
                    <span className={`p-type-dot ${prob.type}`} />
                    <span>{prob.name[currentLang] || prob.name.en}</span>
                  </button>
                ))}
              </div>
            )}

            {/* TAB B: Voice or Text Symptoms */}
            {problemTab === 'voice' && (
              <div className="voice-symptom-box">
                <div className="voice-control-strip">
                  <button
                    type="button"
                    onClick={handleStartVoiceRecognition}
                    className={`voice-record-btn ${isRecordingVoice ? 'recording' : ''}`}
                  >
                    <Mic size={16} />
                    <span>
                      {isRecordingVoice
                        ? currentLang === 'hi'
                          ? 'सुन रहे हैं... (Listening)'
                          : 'Listening...'
                        : t.speakSymptomsBtn}
                    </span>
                  </button>
                </div>
                <textarea
                  value={symptomText}
                  onChange={(e) => {
                    setSymptomText(e.target.value);
                    if (e.target.value.trim()) {
                      setSelectedProblemId(e.target.value.trim());
                    }
                  }}
                  placeholder={t.symptomsInputPlaceholder}
                  className="symptoms-textarea"
                />
              </div>
            )}

            {/* TAB C: Leaf/Plant Photo Screening */}
            {problemTab === 'photo' && (
              <div className="photo-doctor-box">
                <div className="screening-warning-notice">
                  <ShieldCheck size={16} />
                  <span>{t.screeningNote}</span>
                </div>

                <div
                  className="photo-upload-zone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handlePhotoUpload}
                  />
                  {photoPreview ? (
                    <div style={{ textAlign: 'center' }}>
                      <img
                        src={photoPreview}
                        alt="Uploaded leaf"
                        style={{
                          maxHeight: 120,
                          borderRadius: 8,
                          objectFit: 'contain',
                        }}
                      />
                      <p style={{ fontSize: 11, color: '#16A34A', marginTop: 4 }}>
                        ✓ {currentLang === 'hi' ? 'फोटो अपलोड हो गई' : 'Photo uploaded'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <Camera size={32} color="#16A34A" />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{t.takeOrUploadPhoto}</span>
                    </>
                  )}
                </div>

                {isDiagnosingPhoto && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748B' }}>
                    <RefreshCw size={14} className="spin" />
                    <span>{currentLang === 'hi' ? 'लक्षणों की पहचान जारी है...' : 'Screening symptoms...'}</span>
                  </div>
                )}

                {photoCandidates.length > 0 && (
                  <div className="candidate-diagnosis-list">
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>
                      {currentLang === 'hi'
                        ? 'शीर्ष 3 संभावित लक्षण (एक की पुष्टि करें):'
                        : currentLang === 'te'
                        ? 'టాప్ 3 సంభావ్య సమస్యలు (ఒకటి నిర్ధారించండి):'
                        : 'Top 3 Candidate Diagnoses (Confirm one to proceed):'}
                    </p>
                    {photoCandidates.map((cand, idx) => (
                      <div key={idx} className="candidate-item-card">
                        <div className="candidate-header-row">
                          <span className="candidate-name">{cand.problem_name}</span>
                          <span className="candidate-conf-badge">
                            {Math.round(cand.confidence * 100)}% match
                          </span>
                        </div>
                        <div className="confidence-bar-bg">
                          <div
                            className="confidence-bar-fill"
                            style={{ width: `${Math.round(cand.confidence * 100)}%` }}
                          />
                        </div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>
                          <strong>{currentLang === 'hi' ? 'पहचान: ' : 'Symptoms: '}</strong>
                          {cand.symptoms_observed}
                        </div>
                        <div style={{ fontSize: 11, color: '#0369A1' }}>
                          <strong>{currentLang === 'hi' ? 'क्या जांचें: ' : 'Verify: '}</strong>
                          {cand.what_to_verify}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleConfirmCandidate(cand)}
                          className="candidate-confirm-btn"
                        >
                          ✓ {t.confirmCandidateBtn}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Treatment Mode Toggle */}
          <div
            className="form-group"
            style={{
              marginTop: 18,
              borderTop: '1px solid #E2E8F0',
              paddingTop: 14,
            }}
          >
            <label className="form-label" style={{ fontWeight: 700 }}>
              {t.treatmentModeLabel}
            </label>
            <div className="mode-toggle-row">
              <button
                type="button"
                onClick={() => setChemicalType('chemical')}
                className={`mode-btn ${chemicalType === 'chemical' ? 'active-chem' : ''}`}
              >
                {t.chemicalMode}
              </button>
              <button
                type="button"
                onClick={() => setChemicalType('organic')}
                className={`mode-btn ${chemicalType === 'organic' ? 'active-org' : ''}`}
              >
                {t.organicMode}
              </button>
            </div>
          </div>

          {/* 6. Pump Size Chips */}
          <div className="form-group" style={{ marginTop: 14 }}>
            <label className="form-label">{t.pumpSizeLabel}</label>
            <div className="pump-size-pills">
              {[15, 16, 20, 25].map((liters) => (
                <button
                  key={liters}
                  type="button"
                  onClick={() => setTankLiters(liters)}
                  className={`pump-pill ${tankLiters === liters ? 'active' : ''}`}
                >
                  {liters} L {currentLang === 'hi' ? 'टंकी' : 'Tank'}
                </button>
              ))}
            </div>
          </div>

          {/* 7. Crop Area Input */}
          <div className="form-group" style={{ marginTop: 14 }}>
            <label className="form-label">{t.cropAreaLabel}</label>
            <div className="acre-counter-row">
              <input
                type="number"
                min={0.5}
                max={50}
                step={0.5}
                value={acreArea}
                onChange={(e) => setAcreArea(Math.max(0.5, Number(e.target.value)))}
                className="form-input"
              />
              <span className="unit-label">{currentLang === 'hi' ? 'एकड़' : 'Acres'}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Prescription / Abstain Result Card */}
        <div className="dosage-result-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-subtitle" style={{ margin: 0 }}>
              <CheckSquare size={18} />
              <span>{t.calcDosageTitle}</span>
            </h3>

            {/* Read Aloud Button */}
            <button
              type="button"
              onClick={handleReadAloud}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: isSpeaking ? '#DCFCE7' : '#F1F5F9',
                color: isSpeaking ? '#15803D' : '#475569',
                border: '1px solid #CBD5E1',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Volume2 size={14} />
              <span>{isSpeaking ? (currentLang === 'hi' ? 'रुकें' : 'Stop') : t.readAloudBtn}</span>
            </button>
          </div>

          {/* Loading Skeleton */}
          {isLoadingRec && (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748B' }}>
              <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, fontWeight: 600 }}>{t.searchingDosage}</p>
            </div>
          )}

          {/* ABSTAIN BY DEFAULT STATE */}
          {!isLoadingRec && advisoryResult?.abstain && (
            <div className="abstain-warning-card">
              <div className="abstain-header-row">
                <AlertTriangle size={24} color="#D97706" style={{ flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#92400E' }}>
                    {t.abstainNoticeTitle}
                  </h4>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#78350F' }}>
                    {advisoryResult.abstainReason || t.abstainNoticeSub}
                  </p>
                </div>
              </div>

              <div style={{ fontSize: 11, color: '#B45309', background: '#FEF3C7', padding: 8, borderRadius: 6 }}>
                🛡️ <em>{currentLang === 'hi'
                  ? 'अपुष्ट खुराक फसल को जला सकती है या आर्थिक नुकसान पहुंचा सकती है। हम केवल प्रमाणित स्रोत ही दिखाते हैं।'
                  : 'Unverified dosages can damage crops. Abstaining protects farmers.'}</em>
              </div>

              <div className="abstain-actions-row">
                <a href={`tel:${advisoryResult.helplineNumber}`} className="call-kcc-btn">
                  <PhoneCall size={16} />
                  <span>{t.callKccBtn}</span>
                </a>
                {advisoryResult.sourcesFound.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setWhyDoseExpanded(!whyDoseExpanded)}
                    className="open-sources-btn"
                  >
                    <span>{t.openSourcesBtn} ({advisoryResult.sourcesFound.length})</span>
                    {whyDoseExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                )}
              </div>

              {whyDoseExpanded && advisoryResult.sourcesFound.length > 0 && (
                <div className="sources-chips-row">
                  {advisoryResult.sourcesFound.map((src, i) => (
                    <a
                      key={i}
                      href={src.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="source-link-chip"
                    >
                      <ExternalLink size={12} />
                      <span>{src.publisher}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VERIFIED RECOMMENDATION RESULT */}
          {!isLoadingRec && advisoryResult?.recommendation && !advisoryResult.abstain && (
            <div style={{ marginTop: 14 }}>
              {/* Badges Row */}
              <div className="verified-badge-row">
                <span className="verified-official-badge">
                  <ShieldCheck size={13} />
                  <span>
                    {advisoryResult.recommendation.badge === 'Verified (expert-reviewed)'
                      ? t.verifiedOfficialBadge
                      : t.fromOfficialSourceBadge}
                  </span>
                </span>
                {advisoryResult.isCached && (
                  <span className="cached-offline-badge">
                    <span>⚡ {currentLang === 'hi' ? 'ऑफलाइन कैश्ड' : 'Offline Cached'}</span>
                  </span>
                )}
              </div>

              {/* Prescribed Dosage Box (100% Dynamic) */}
              <div className="prescribed-numbers-box">
                {/* 1. Dose per Tank */}
                <div className="p-num-item">
                  <span className="p-lbl">
                    {currentLang === 'hi'
                      ? `प्रति पंप मात्रा (Per ${tankLiters}L Tank):`
                      : currentLang === 'te'
                      ? `ప్రతి ${tankLiters}L పంపు మోతాదు:`
                      : `Dose per ${tankLiters}L Tank:`}
                  </span>
                  <span className="p-val highlight">
                    {advisoryResult.sprayPlan?.chemicalPerTank}
                  </span>
                  <span className="p-sub">
                    {advisoryResult.recommendation.product}{' '}
                    {advisoryResult.recommendation.formulation}
                  </span>
                </div>

                {/* 2. Total Pumps */}
                <div className="p-num-item">
                  <span className="p-lbl">
                    {currentLang === 'hi'
                      ? 'कुल पंप संख्या (Total Pumps):'
                      : currentLang === 'te'
                      ? 'మొత్తం పంపులు:'
                      : 'Total Pumps:'}
                  </span>
                  <span className="p-val">
                    {advisoryResult.sprayPlan?.totalPumps} {currentLang === 'hi' ? 'पंप' : 'pumps'}
                  </span>
                  <span className="p-sub">
                    {acreArea} {currentLang === 'hi' ? 'एकड़' : 'acres'} (
                    {advisoryResult.recommendation.water_per_acre_l}L {currentLang === 'hi' ? 'पानी/एकड़' : 'water/acre'})
                  </span>
                </div>

                {/* 3. Total Chemical Quantity */}
                <div className="p-num-item total">
                  <span className="p-lbl">
                    {currentLang === 'hi'
                      ? 'कुल आवश्यक दवा (Total Quantity):'
                      : currentLang === 'te'
                      ? 'మొత్తం మందు పరిమాణం:'
                      : 'Total Chemical Quantity:'}
                  </span>
                  <span className="p-val total-amt">
                    {advisoryResult.sprayPlan?.totalChemicalQty}
                  </span>
                  {/* Estimated Cost: Hidden if not available, never guessed */}
                  {advisoryResult.sprayPlan?.estimatedCostFormatted && (
                    <span className="p-sub" style={{ fontWeight: 600, color: '#166534' }}>
                      {currentLang === 'hi' ? 'अनुमानित खर्च: ' : 'Est. Cost: '}
                      {advisoryResult.sprayPlan.estimatedCostFormatted}
                    </span>
                  )}
                </div>

                {/* Spray Interval & PHI */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    color: '#64748B',
                    borderTop: '1px solid #E2E8F0',
                    paddingTop: 8,
                  }}
                >
                  {advisoryResult.recommendation.spray_interval_days && (
                    <span>
                      📅 {currentLang === 'hi' ? 'अंतराल: ' : 'Interval: '}
                      {advisoryResult.recommendation.spray_interval_days} {currentLang === 'hi' ? 'दिन' : 'days'}
                    </span>
                  )}
                  {advisoryResult.recommendation.phi_days && (
                    <span>
                      ⏳ PHI:{' '}
                      {advisoryResult.recommendation.phi_days} {currentLang === 'hi' ? 'दिन' : 'days'}
                    </span>
                  )}
                </div>
              </div>

              {/* Expandable "Why this dose?" Rationale & Evidence */}
              <div className="why-dose-accordion">
                <button
                  type="button"
                  onClick={() => setWhyDoseExpanded(!whyDoseExpanded)}
                  className="accordion-toggle-btn"
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <HelpCircle size={15} />
                    <span>{t.whyThisDose}</span>
                  </span>
                  {whyDoseExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {whyDoseExpanded && (
                  <div>
                    <div className="evidence-quote-box">
                      <div style={{ fontWeight: 700, marginBottom: 4, color: '#0369A1' }}>
                        📖 {currentLang === 'hi' ? 'अकादमिक उद्धरण (Evidence Quote):' : 'Verbatim Evidence:'}
                      </div>
                      "{advisoryResult.recommendation.evidence_quote}"
                    </div>

                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
                        {currentLang === 'hi' ? 'प्रमाणित स्रोत:' : 'Official Publisher:'}
                      </div>
                      <div className="sources-chips-row">
                        <a
                          href={advisoryResult.recommendation.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="source-link-chip"
                        >
                          <ExternalLink size={12} />
                          <span>
                            {advisoryResult.recommendation.publisher} (
                            {advisoryResult.recommendation.published_or_accessed_date})
                          </span>
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Secondary Guidance Cards */}
              <div className="secondary-guidance-grid">
                {/* 1. Insect Resistance Rotation Tip */}
                {advisoryResult.recommendation.mode_of_action_group && (
                  <div className="guidance-card resistance">
                    <div className="g-title">
                      <span>🔄</span>
                      <span>{t.resistanceRotationTip}</span>
                    </div>
                    <div>
                      {currentLang === 'hi'
                        ? `रासायनिक समूह MoA: ${advisoryResult.recommendation.mode_of_action_group}। लगातार एक ही समूह का स्प्रे न करें ताकि कीटों में प्रतिरोधक क्षमता न बने।`
                        : `Mode of Action Group: ${advisoryResult.recommendation.mode_of_action_group}. Rotate with a different chemical group on next spray to avoid resistance.`}
                    </div>
                  </div>
                )}

                {/* 2. Organic / IPM Alternative */}
                {advisoryResult.recommendation.organic_alternative && (
                  <div className="guidance-card organic">
                    <div className="g-title">
                      <span>🌿</span>
                      <span>{t.organicAlternativeTip}</span>
                    </div>
                    <div>{advisoryResult.recommendation.organic_alternative}</div>
                  </div>
                )}
              </div>

              {/* Dynamic Safety Checklist */}
              <div className="safety-checklist-box" style={{ marginTop: 14 }}>
                <h4 className="safety-title">
                  <ShieldAlert size={16} />
                  <span>{t.safetyChecklistTitle}</span>
                </h4>
                <ul className="safety-list">
                  <li>😷 {currentLang === 'hi' ? 'छिड़काव के दौरान मास्क व दस्ताने पहनें।' : 'Wear mask, goggles and rubber gloves while spraying.'}</li>
                  <li>💨 {currentLang === 'hi' ? 'हमेशा हवा की दिशा में छिड़काव करें (हवा के विपरीत नहीं)।' : 'Always spray along wind direction, never against wind.'}</li>
                  <li>☀️ {currentLang === 'hi' ? 'सुबह 6-9 बजे या शाम 4-6 बजे के शांत मौसम में छिड़काव करें।' : 'Spray during cool morning (6-9 AM) or late evening (4-6 PM).'}</li>
                  {advisoryResult.recommendation.reentry_period_hours && (
                    <li>⏳ {currentLang === 'hi'
                      ? `खेत में पुनः प्रवेश अवधि: ${advisoryResult.recommendation.reentry_period_hours} घंटे बाद ही जाएं।`
                      : `Re-entry period: Wait ${advisoryResult.recommendation.reentry_period_hours} hours before entering the sprayed field.`}</li>
                  )}
                  <li>👶 {currentLang === 'hi' ? 'दवा को बच्चों और जल स्रोतों से दूर रखें।' : 'Keep containers safely away from children and water sources.'}</li>
                </ul>
              </div>

              {/* Compulsory Label Notice */}
              <p
                style={{
                  fontSize: 11,
                  color: '#64748B',
                  marginTop: 10,
                  fontStyle: 'italic',
                  lineHeight: 1.4,
                }}
              >
                ⚠️ {t.labelNotice}
              </p>

              {/* Bottom Action Bar */}
              <div className="action-bar-strip">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(true)}
                  className="report-btn"
                >
                  <Flag size={13} />
                  <span>{t.reportWrongRecBtn}</span>
                </button>
                <span style={{ fontSize: 10, color: '#94A3B8' }}>
                  KisanSetu • ICAR / State Agri Univ verified
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {reportModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              padding: 20,
              maxWidth: 420,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1E293B' }}>
                {t.reportWrongRecBtn}
              </h4>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} color="#64748B" />
              </button>
            </div>

            {reportSubmitted ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#16A34A' }}>
                <CheckCircle2 size={36} style={{ margin: '0 auto 8px' }} />
                <p style={{ fontWeight: 700, fontSize: 14 }}>
                  {currentLang === 'hi'
                    ? 'रिपोर्ट सफलतापूर्वक दर्ज की गई!'
                    : 'Report logged for expert KVK review!'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit}>
                <p style={{ fontSize: 12, color: '#64748B', marginTop: 0 }}>
                  {currentLang === 'hi'
                    ? 'कृपया बताएं कि कौन सी खुराक या जानकारी गलत लग रही है:'
                    : 'Please explain what seems incorrect with this dose or advisory:'}
                </p>
                <textarea
                  rows={4}
                  value={reportedIssue}
                  onChange={(e) => setReportedIssue(e.target.value)}
                  placeholder={
                    currentLang === 'hi'
                      ? 'उदा: हमारे जिले में यह कीटनाशक बैन है या खुराक बहुत अधिक है...'
                      : 'e.g. Dose seems too high or product restricted in our district...'
                  }
                  required
                  style={{
                    width: '100%',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    padding: 8,
                    fontSize: 13,
                    fontFamily: 'inherit',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 6,
                      border: '1px solid #CBD5E1',
                      background: '#F8FAFC',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 6,
                      border: 'none',
                      background: '#DC2626',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
