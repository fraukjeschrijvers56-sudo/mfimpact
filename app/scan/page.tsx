'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MainLayout from '../components/MainLayout';
import GlassWindow from '../components/GlassWindow';

interface Question {
  key: string;
  question: string;
  type: 'yes-no' | 'yes-no-partial' | 'text';
}

const scanQuestions: Record<string, { title: string; questions: Question[] }> = {
  marktvraag: {
    title: 'Marktvraag: wat vragen afnemers, banken en tenders?',
    questions: [
      { key: 'vsme_gevraagd', question: 'Vragen afnemers/banken om VSME-rapportage?', type: 'yes-no' },
      { key: 'co2_footprint_gevraagd', question: 'Wordt CO₂-footprint gevraagd?', type: 'yes-no' },
      { key: 'ecovadis_gevraagd', question: 'Vragen afnemers om EcoVadis of vergelijkbare rating?', type: 'yes-no' },
      { key: 'co2_prestatieladder_gevraagd', question: 'Is CO₂-Prestatieladder vereist voor aanbestedingen?', type: 'yes-no' },
      { key: 'iso14001_gevraagd', question: 'Wordt ISO 14001 certificering gevraagd?', type: 'yes-no' },
      { key: 'iso26000_gevraagd', question: 'Wordt ISO 26000 genoemd in aanbestedingen?', type: 'yes-no' },
      { key: 'gedragscode_gevraagd', question: 'Vragen afnemers om leveranciersgedragscode?', type: 'yes-no' },
      { key: 'andere_eisen', question: 'Andere ESG/MVO-eisen van afnemers?', type: 'text' },
    ],
  },
  operationeel: {
    title: 'Operationeel bewijs: wat heeft de klant al?',
    questions: [
      { key: 'energie_monitoring', question: 'Is er energiemonitoring (elektriciteit/gas)?', type: 'yes-no' },
      { key: 'energie_audit', question: 'Is er een actuele energie-audit?', type: 'yes-no' },
      { key: 'co2_scope1_2', question: 'Wordt CO₂ Scope 1+2 berekend?', type: 'yes-no' },
      { key: 'co2_scope3', question: 'Wordt CO₂ Scope 3 berekend?', type: 'yes-no-partial' },
      { key: 'afval_scheiding', question: 'Is er afvalscheiding en registratie?', type: 'yes-no' },
      { key: 'veiligheid_ri_e', question: 'Is er een actuele RI&E (risico-inventarisatie)?', type: 'yes-no' },
      { key: 'veiligheid_registratie', question: 'Worden arbeidsongevallen geregistreerd?', type: 'yes-no' },
      { key: 'diversiteit_data', question: 'Zijn er gegevens over diversiteit (WPM)?', type: 'yes-no-partial' },
      { key: 'governance_integriteit', question: 'Is er een integriteitscode of klokkenluiderregeling?', type: 'yes-no' },
      { key: 'leveranciers_screening', question: 'Wordt er leveranciersscreening gedaan?', type: 'yes-no-partial' },
      { key: 'leveranciers_gedragscode', question: 'Is er een leveranciersgedragscode?', type: 'yes-no' },
      { key: 'product_ecolabel', question: 'Hebben producten een ecolabel of milieucertificering?', type: 'yes-no-partial' },
    ],
  },
};

function ScanPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const clientId = searchParams?.get('client');
  
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState(clientId || '');
  const [currentCategory, setCurrentCategory] = useState<string>('marktvraag');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/klanten/list')
      .then(r => r.json())
      .then(data => setClients(data));
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetch(`/api/scan/${selectedClient}`)
        .then(r => r.json())
        .then(data => {
          const answerMap: Record<string, string> = {};
          data.forEach((a: any) => {
            answerMap[`${a.category}_${a.question_key}`] = a.answer;
          });
          setAnswers(answerMap);
        });
    }
  }, [selectedClient]);

  const handleAnswerChange = (category: string, questionKey: string, value: string) => {
    setAnswers({ ...answers, [`${category}_${questionKey}`]: value });
  };

  const handleSave = async () => {
    if (!selectedClient) {
      alert('Selecteer eerst een klant');
      return;
    }

    setLoading(true);

    const data = Object.entries(answers).map(([key, answer]) => {
      const [category, ...questionParts] = key.split('_');
      const questionKey = questionParts.join('_');
      return { category, question_key: questionKey, answer };
    });

    await fetch(`/api/scan/${selectedClient}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: data }),
    });

    setLoading(false);
    alert('Scan opgeslagen');
  };

  const handleGenerateGaps = async () => {
    if (!selectedClient) {
      alert('Selecteer eerst een klant');
      return;
    }

    setLoading(true);

    await fetch(`/api/scan/${selectedClient}/gaps`, {
      method: 'POST',
    });

    setLoading(false);
    router.push(`/klanten/${selectedClient}`);
  };

  const currentQuestions = scanQuestions[currentCategory];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header in glass card for readability */}
        <GlassWindow>
          <div>
            <h1 className="text-3xl font-bold text-white">Scan & gatanalyse</h1>
            <p className="mt-2 text-white/70">Inventariseer marktvraag en operationeel bewijs</p>
          </div>
        </GlassWindow>

        <div className="bg-white shadow rounded-lg p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecteer klant
          </label>
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="block w-full md:w-96 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
          >
            <option value="">-- Kies een klant --</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.naam}
              </option>
            ))}
          </select>
        </div>

        {selectedClient && (
          <>
            <div className="bg-white shadow rounded-lg">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  {Object.entries(scanQuestions).map(([key, section]) => (
                    <button
                      key={key}
                      onClick={() => setCurrentCategory(key)}
                      className={`px-6 py-3 text-sm font-medium border-b-2 ${
                        currentCategory === key
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {section.title}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6 space-y-6">
                {currentQuestions.questions.map((q) => (
                  <div key={q.key} className="border-b pb-4">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      {q.question}
                    </label>
                    {q.type === 'yes-no' && (
                      <div className="flex space-x-4">
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            name={`${currentCategory}_${q.key}`}
                            value="ja"
                            checked={answers[`${currentCategory}_${q.key}`] === 'ja'}
                            onChange={(e) => handleAnswerChange(currentCategory, q.key, e.target.value)}
                            className="form-radio text-blue-600"
                          />
                          <span className="ml-2">Ja</span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            name={`${currentCategory}_${q.key}`}
                            value="nee"
                            checked={answers[`${currentCategory}_${q.key}`] === 'nee'}
                            onChange={(e) => handleAnswerChange(currentCategory, q.key, e.target.value)}
                            className="form-radio text-blue-600"
                          />
                          <span className="ml-2">Nee</span>
                        </label>
                      </div>
                    )}
                    {q.type === 'yes-no-partial' && (
                      <div className="flex space-x-4">
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            name={`${currentCategory}_${q.key}`}
                            value="ja"
                            checked={answers[`${currentCategory}_${q.key}`] === 'ja'}
                            onChange={(e) => handleAnswerChange(currentCategory, q.key, e.target.value)}
                            className="form-radio text-blue-600"
                          />
                          <span className="ml-2">Ja</span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            name={`${currentCategory}_${q.key}`}
                            value="deels"
                            checked={answers[`${currentCategory}_${q.key}`] === 'deels'}
                            onChange={(e) => handleAnswerChange(currentCategory, q.key, e.target.value)}
                            className="form-radio text-blue-600"
                          />
                          <span className="ml-2">Deels</span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            name={`${currentCategory}_${q.key}`}
                            value="nee"
                            checked={answers[`${currentCategory}_${q.key}`] === 'nee'}
                            onChange={(e) => handleAnswerChange(currentCategory, q.key, e.target.value)}
                            className="form-radio text-blue-600"
                          />
                          <span className="ml-2">Nee</span>
                        </label>
                      </div>
                    )}
                    {q.type === 'text' && (
                      <textarea
                        value={answers[`${currentCategory}_${q.key}`] || ''}
                        onChange={(e) => handleAnswerChange(currentCategory, q.key, e.target.value)}
                        rows={3}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Bezig...' : 'Scan opslaan'}
              </button>
              <button
                onClick={handleGenerateGaps}
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Genereer gatanalyse
              </button>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-600">Laden...</div>
        </div>
      </MainLayout>
    }>
      <ScanPageContent />
    </Suspense>
  );
}
