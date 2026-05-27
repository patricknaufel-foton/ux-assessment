import React, { useMemo, useState } from "react";
import { Analytics } from "@vercel/analytics/react"
import * as XLSX from "xlsx";
import { Upload, Users, TrendingUp, AlertTriangle, Award, BookOpen, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { generateTeamAssessment } from "./services/geminiService";
import teamAssessmentPrompt from "./prompts/teamAssessmentPrompt";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

function Card({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}

function CardContent({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}

const MAX_PROFESSIONALS = 5;

const COLUMN_MAP = {
  name: "Nome",
  role: "Cargo/Posição Atual",
  seniority: "Com qual senioridade em UX você mais se identifica",
  experience: "Tempo de Experiência na Área de UX",
  education: "Formação e Certificados Relevantes em UX",
};

const SCORE_COMPETENCIES = [
  {
    label: "Pesquisa com Usuários",
    column: "Pesquisa com Usuários (entrevistas, teste de usabilidade etc)",
    commentColumn: "Comentário - Descreva suas experiências e desafios nessa área",
  },
  {
    label: "Design de Interfaces",
    column: "Design de Interfaces (criação de wireframes, protótipos, princípios de design, layouts etc)",
    commentColumn: "Comentário - Cite ferramentas utilizadas e exemplos de projetos",
  },
  {
    label: "Arquitetura de Informação",
    column: "Arquitetura de Informação",
    commentColumn: "Comentário - Descreva como organiza e estrutura a informação em seus projetos",
  },
  {
    label: "Ferramentas de Design",
    column: "Ferramentas de Design (Figma, Sketch, Adobe XD, Canvas etc)",
    commentColumn: "Comentário - Liste as ferramentas que você utiliza e o nível de familiaridade",
  },
  {
    label: "Métricas e Dados de UX",
    column: "Análise, Métricas e Dados de UX (GA, Hotjar, DataBricks etc)",
    commentColumn: "Comentário - Explique seu conhecimento em análise de interpretação de Dados e liste as ferramentas que tem familiaridade",
  },
  {
    label: "Documentação e Entregas de UX",
    column: "Documentação, Comunicação e Entregas de UX (relatórios, handoff, apresentações etc)",
    commentColumn: "Comentário - Compartilhe exemplos de como documenta e apresenta suas entregas",
  },
  {
    label: "Feedback e Iteração",
    column: "Feedback e Iteração nas Entregas",
    commentColumn: "Comentário - Como você incorpora feedbacks e realiza iterações",
  },
  {
    label: "Comunicação e Colaboração",
    column: "Comunicação e Colaboração em Equipe",
    commentColumn: "Comentário - Descreva como você se comunica e colabora em diferentes áreas, como produto e desenvolvimento",
  },
  {
    label: "Receber e Dar Feedbacks",
    column: "Habilidade de Receber e Dar Feedbacks",
    commentColumn: "Comentário - Cite situações em que você aplicou feedback construtivo e como lidou com críticas",
  },
  {
    label: "Adaptabilidade",
    column: "Adaptabilidade e Resolução de Problemas",
    commentColumn: "Comentário - Relate uma experiência onde precisou adaptar sua abordagem para resolver um desafio",
  },
  {
    label: "Autonomia",
    column: "Autonomia no Desenvolvimento de Projetos",
    commentColumn: "Comentário - Descreve como toma decisões e assume a responsabilidade em sua atuação",
  },
  {
    label: "Apresentação para Stakeholders",
    column: "Você se sente confortável apresentando projetos para stakeholders?",
  },
];

const TEXT_COMPETENCIES = [
  {
    label: "Figma Avançado",
    column: "Quão confortável você se sente criando interfaces no Figma utilizando boas práticas (autolayout, componentes, variantes)",
    mapping: {
      "Nunca usei": 1,
      "Uso básico": 2,
      "Uso no dia a dia": 3,
      "Sou referência técnica no time": 5,
    },
  },
  {
    label: "Design System",
    column: "O que melhor representa sua prática com Design System",
    mapping: {
      "Nunca usei": 1,
      "Uso os componentes prontos, mas tenho dificuldade pra adaptar e entende se estou aplicando corretamente": 2,
      "Entendo padrões, componho layouts consistentes e construo componentes personalizados quando necessário, mantendo os padrões dos Fundamentos Visuais": 4,
    },
  },
  {
    label: "Comportamento em Reuniões",
    column: "Como você se comporta em reuniões?",
    mapping: {
      "Apresento o que fiz quando solicitado": 2,
      "Apresento soluções com justificativas claras": 4,
      "Faço mediação, traduzo necessidades e proponho caminhos de forma ativa": 5,
    },
  },
];

const OPEN_QUESTIONS = [
  "Qual é sua principal expectativa ao participar desse programa de mentoria?",
  "Quais habilidades ou competências específicas você gostaria de desenvolver ou aprimorar?",
  "Quais desafios você tem enfrentado atualmente em seus projetos de UX (caso já atue na área)?",
  "Com base em suas atividades recentes, identifique os principais gaps de conhecimento ou práticas que você percebe em seu trabalho de UX.",
  "Existe alguma ferramenta, metodologia ou prática que você considere importante aprender ou aprimorar? Por quê?",
  "Você sente que há momentos específicos (ex.: durante a prototipação ou em testes de usabilidade) em que sua atuação pode ser fortalecida? Se sim, em quais momentos?",
  "Espaço livre para você escrever comentário ou observações.",
];

const trainingMap = [
  { keywords: ["pesquisa", "usuário", "discovery"], training: "UX Research e Product Discovery" },
  { keywords: ["interface", "figma", "ferramentas"], training: "UI Design e Prototipação no Figma" },
  { keywords: ["arquitetura"], training: "Arquitetura de Informação" },
  { keywords: ["métrica", "dados"], training: "Métricas, Analytics e Experimentação" },
  { keywords: ["documentação", "entregas"], training: "Documentação, Handoff e Comunicação de UX" },
  { keywords: ["design system"], training: "Construção e Governança de Design Systems" },
  { keywords: ["feedback"], training: "Feedback, Crítica de Design e Iteração" },
  { keywords: ["comunicação", "colaboração", "reuniões"], training: "Comunicação, Colaboração e Facilitação" },
  { keywords: ["adaptabilidade"], training: "Resolução de Problemas e Adaptabilidade" },
  { keywords: ["autonomia"], training: "Autonomia, Priorização e Tomada de Decisão" },
  { keywords: ["stakeholders"], training: "Apresentação para Stakeholders e Storytelling" },
];

function cleanHeader(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function parseNumber(value) {
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? Math.max(1, Math.min(5, n)) : null;
}

function getValue(row, targetColumn) {
  const cleanTarget = cleanHeader(targetColumn);
  const key = Object.keys(row).find((column) => cleanHeader(column) === cleanTarget);
  return key ? row[key] : "";
}

function getScoreLabel(score) {
  if (score >= 4.5) return "Sou expert e referência no time";
  if (score >= 3.5) return "Uso sem dificuldades";
  if (score >= 2.5) return "Uso mas preciso de ajuda";
  if (score >= 1.5) return "Conheço mas nunca usei";
  return "Não conheço";
}

function classifyScore(score) {
  if (score >= 4) return "Fortaleza consolidada";
  if (score >= 3) return "Competência em uso com necessidade de apoio";
  if (score >= 2) return "Conhecimento sem prática consolidada";
  return "Atenção prioritária";
}

function classifyMaturity(score) {
  if (score >= 4.1) return "Avançado";
  if (score >= 3.1) return "Estruturado";
  if (score >= 2.1) return "Emergente";
  return "Inicial";
}

function suggestTraining(competency) {
  const text = competency.toLowerCase();
  const found = trainingMap.find((item) => item.keywords.some((k) => text.includes(k)));
  return found?.training || "Plano de desenvolvimento em competências de UX Design";
}

function getColor(index) {
  const colors = ["#B43108", "#F2F2F2", "#7A7A7A", "#8A1F11", "#D7D7D7"];
  return colors[index % colors.length];
}

function getStrengthsAndGaps(scores) {
  const entries = Object.entries(scores).filter(([, value]) => typeof value === "number");
  const strengths = entries.filter(([, value]) => value >= 4).sort((a, b) => b[1] - a[1]).map(([key]) => key);
  const gaps = entries.filter(([, value]) => value < 3).sort((a, b) => a[1] - b[1]).map(([key]) => key);
  return { strengths: strengths.slice(0, 3), gaps: gaps.slice(0, 3) };
}

export default function App() {
  const [professionals, setProfessionals] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [assessment, setAssessment] = useState("");
  const [loadingAssessment, setLoadingAssessment] = useState(false);

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (!rows.length) {
        setError("A planilha está vazia ou não foi possível ler os dados.");
        return;
      }

      const allCompetencies = [...SCORE_COMPETENCIES, ...TEXT_COMPETENCIES];

      const parsedProfessionals = rows.slice(0, MAX_PROFESSIONALS).map((row, index) => {
        const name = normalizeText(getValue(row, COLUMN_MAP.name)) || `Profissional ${index + 1}`;
        const role = normalizeText(getValue(row, COLUMN_MAP.role)) || "Dado não informado";
        const seniority = normalizeText(getValue(row, COLUMN_MAP.seniority)) || "Dado não informado";
        const experience = normalizeText(getValue(row, COLUMN_MAP.experience)) || "Dado não informado";
        const education = normalizeText(getValue(row, COLUMN_MAP.education)) || "Dado não informado";

        const scores = {};
        const comments = {};
        const openAnswers = {};

        SCORE_COMPETENCIES.forEach((item) => {
          scores[item.label] = parseNumber(getValue(row, item.column));
          if (item.commentColumn) {
            comments[item.label] = normalizeText(getValue(row, item.commentColumn));
          }
        });

        TEXT_COMPETENCIES.forEach((item) => {
          const rawAnswer = normalizeText(getValue(row, item.column));
          scores[item.label] = item.mapping[rawAnswer] ?? null;
          comments[item.label] = rawAnswer;
        });

        OPEN_QUESTIONS.forEach((question) => {
          openAnswers[question] = normalizeText(getValue(row, question));
        });

        const validScores = Object.values(scores).filter((score) => typeof score === "number");
        const average = validScores.length
          ? Number((validScores.reduce((sum, score) => sum + score, 0) / validScores.length).toFixed(2))
          : 0;

        const { strengths, gaps } = getStrengthsAndGaps(scores);

        return {
          name,
          role,
          seniority,
          experience,
          education,
          scores,
          comments,
          openAnswers,
          average,
          strengths,
          gaps,
        };
      });

      setCompetencies(allCompetencies.map((item) => item.label));
      setProfessionals(parsedProfessionals);
    } catch (err) {
      setError("Não foi possível processar a planilha. Verifique se o arquivo está no padrão definido e em formato XLSX ou CSV válido.");
    }
  }

  const radarData = useMemo(() => {
    return competencies.map((competency) => {
      const item = { competency };
      professionals.forEach((professional) => {
        item[professional.name] = professional.scores[competency] || 0;
      });
      return item;
    });
  }, [competencies, professionals]);

  const teamAverage = useMemo(() => {
    if (!professionals.length || !competencies.length) return [];

    return competencies.map((competency) => {
      const validScores = professionals
        .map((p) => p.scores[competency])
        .filter((score) => typeof score === "number");

      const average = validScores.length
        ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
        : 0;

      const max = validScores.length ? Math.max(...validScores) : 0;
      const min = validScores.length ? Math.min(...validScores) : 0;
      const dispersion = Number((max - min).toFixed(2));

      return {
        competency,
        average: Number(average.toFixed(2)),
        status: classifyScore(average),
        dispersion,
        training: suggestTraining(competency),
      };
    }).sort((a, b) => b.average - a.average);
  }, [professionals, competencies]);

  const overallTeamAverage = useMemo(() => {
    const values = professionals.map((item) => item.average).filter(Boolean);
    if (!values.length) return 0;
    return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
  }, [professionals]);

  const maturity = classifyMaturity(overallTeamAverage);
  const strengths = teamAverage.filter((item) => item.average >= 4).sort((a, b) => b.average - a.average);
  const weaknesses = teamAverage.filter((item) => item.average < 3).sort((a, b) => a.average - b.average);
  const trainingSuggestions = weaknesses.length ? weaknesses : teamAverage.filter((item) => item.average < 4);

  async function handleGenerateAssessment() {
    try {
      setLoadingAssessment(true);
      setAssessment("");

      const payload = {
        productName: "Fóton UX/UI Assessment para Times",
        overallTeamAverage,
        maturity,
        teamAverage,
        strengths,
        weaknesses,
        trainingSuggestions,
        professionals: professionals.map((p) => ({
          name: p.name,
          role: p.role,
          seniority: p.seniority,
          experience: p.experience,
          education: p.education,
          average: p.average,
          strengths: p.strengths,
          gaps: p.gaps,
          scores: p.scores,
          comments: p.comments,
          openAnswers: p.openAnswers,
        })),
      };

      const result = await generateTeamAssessment(teamAssessmentPrompt, payload);
      setAssessment(result);
    } catch (err) {
      console.error(err);
      setAssessment("O serviço de IA está temporariamente sobrecarregado. Tente novamente em alguns segundos.");
    } finally {
      setLoadingAssessment(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#080808] text-[#F2F2F2] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 md:grid-cols-[1.4fr_.6fr] items-center"
        >
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="h-14 w-40 rounded-2xl bg-[#111111] border border-[#2A2A2A] flex items-center justify-center overflow-hidden px-4">
                <img src="/foton.png" alt="Fóton" className="max-h-10 object-contain" />
              </div>
              <div className="h-12 w-px bg-[#3A3A3A]" />
              <p className="text-sm uppercase tracking-[0.3em] text-[#B43108]">UX/UI Assessment</p>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mt-2 leading-tight">Fóton UX/UI Assessment para Times</h1>
            <p className="text-[#CFCFCF] mt-3 max-w-3xl">
              Dashboard executivo para análise comparativa de profissionais de design, maturidade coletiva,
              pontos fortes, gaps e recomendações de desenvolvimento do time.
            </p>
          </div>

          <Card className="bg-[#111111] border-[#2A2A2A] rounded-2xl shadow-xl">
            <CardContent className="p-5 space-y-4">
              <label className="flex flex-col items-center justify-center gap-3 border border-dashed border-[#5A5A5A] rounded-2xl p-6 cursor-pointer hover:bg-[#1A1A1A] transition">
                <Upload className="w-8 h-8 text-[#B43108]" />
                <span className="font-medium text-center">Enviar planilha padrão XLSX ou CSV</span>
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
              </label>
              {fileName && <p className="text-sm text-[#A7A7A7]">Arquivo: {fileName}</p>}
              {error && <p className="text-sm text-red-300">{error}</p>}
            </CardContent>
          </Card>
        </motion.header>

        {professionals.length > 0 && (
          <>
            <section className="grid gap-4 md:grid-cols-5"></section>

            <section className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-[#111111] border-[#2A2A2A] rounded-2xl shadow-xl">
                <CardContent className="p-5">
                  <h2 className="text-xl font-bold mb-4">Radar comparativo individual</h2>
                  <div className="h-[480px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="competency" tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                        {professionals.map((professional, index) => (
                          <Radar
                            key={professional.name}
                            name={professional.name}
                            dataKey={professional.name}
                            stroke={getColor(index)}
                            fill={getColor(index)}
                            fillOpacity={0.12}
                          />
                        ))}
                        <Legend />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#2A2A2A] rounded-2xl shadow-xl">
                <CardContent className="p-5">
                  <h2 className="text-xl font-bold mb-4">Média do time por competência</h2>
                  <div className="h-[480px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={teamAverage} layout="vertical" margin={{ left: 24, right: 24 }}>
                        <XAxis type="number" domain={[0, 5]} tick={{ fill: "#cbd5e1" }} />
                        <YAxis type="category" dataKey="competency" width={160} tick={{ fill: "#cbd5e1", fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="average" name="Média" fill="#B43108" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
              <AnalysisCard title="Pontos fortes do time" icon={<Award className="text-[#F2F2F2]" />} items={strengths} empty="Nenhuma competência com média igual ou superior a 4." />
              <AnalysisCard title="Pontos fracos / atenção" icon={<AlertTriangle className="text-[#B43108]" />} items={weaknesses} empty="Nenhuma competência crítica abaixo de 3." />
              <TrainingCard items={trainingSuggestions} />
            </section>

            <section>
              <Card className="bg-[#111111] border-[#2A2A2A] rounded-2xl shadow-xl">
                <CardContent className="p-5 overflow-auto">
                  <h2 className="text-xl font-bold mb-4">Tabela comparativa dos profissionais</h2>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-left border-b border-[#3A3A3A]">
                        <th className="py-3 pr-4">Profissional</th>
                        <th className="py-3 pr-4">Cargo</th>
                        <th className="py-3 pr-4">Senioridade</th>
                        <th className="py-3 pr-4">Experiência</th>
                        <th className="py-3 pr-4">Média</th>
                        <th className="py-3 pr-4">Forças</th>
                        <th className="py-3 pr-4">Gaps</th>
                      </tr>
                    </thead>
                    <tbody>
                      {professionals.map((professional) => (
                        <tr key={professional.name} className="border-b border-[#2A2A2A] align-top">
                          <td className="py-3 pr-4 font-medium">{professional.name}</td>
                          <td className="py-3 pr-4 text-[#CFCFCF]">{professional.role}</td>
                          <td className="py-3 pr-4 text-[#CFCFCF]">{professional.seniority}</td>
                          <td className="py-3 pr-4 text-[#CFCFCF]">{professional.experience}</td>
                          <td className="py-3 pr-4 font-bold">{professional.average}</td>
                          <td className="py-3 pr-4 text-[#F2F2F2]">{professional.strengths.join(", ") || "Dado não informado"}</td>
                          <td className="py-3 pr-4 text-[#D26B4A]">{professional.gaps.join(", ") || "Dado não informado"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </section>

            <section>
              <Card className="bg-[#111111] border-[#2A2A2A] rounded-2xl shadow-xl">
                <CardContent className="p-5 overflow-auto">
                  <h2 className="text-xl font-bold mb-4">Médias por competência</h2>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-left border-b border-[#3A3A3A]">
                        <th className="py-3 pr-4">Competência</th>
                        <th className="py-3 pr-4">Média</th>
                        <th className="py-3 pr-4">Classificação</th>
                        <th className="py-3 pr-4">Leitura da escala</th>
                        <th className="py-3 pr-4">Dispersão</th>
                        <th className="py-3 pr-4">Treinamento sugerido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamAverage.map((item) => (
                        <tr key={item.competency} className="border-b border-[#2A2A2A]">
                          <td className="py-3 pr-4 text-[#F2F2F2]">{item.competency}</td>
                          <td className="py-3 pr-4 font-bold">{item.average}</td>
                          <td className="py-3 pr-4">{item.status}</td>
                          <td className="py-3 pr-4 text-[#CFCFCF]">{getScoreLabel(item.average)}</td>
                          <td className="py-3 pr-4">{item.dispersion}</td>
                          <td className="py-3 pr-4 text-[#E66A3A]">{item.training}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </section>
            
            <div className="flex justify-center mt-8">
              <button
                  onClick={handleGenerateAssessment}
                  disabled={loadingAssessment}
                  className="
                  bg-[#B43108]
                  hover:bg-[#8A1F11]
                  disabled:opacity-60
                  disabled:cursor-not-allowed
                  transition
                  px-8
                  py-4
                  rounded-2xl
                  font-semibold
                  text-[#F2F2F2]
                  shadow-2xl
                  text-lg
                "
                >
                  {loadingAssessment
                    ? "Gerando análise..."
                    : "Gerar análise estratégica"}
                </button>
            </div>

            {assessment && (
              <section>
                <Card className="bg-[#111111] border-[#2A2A2A] rounded-2xl shadow-xl">
                  <CardContent className="p-6 md:p-8">
                    <div className="flex items-center justify-between gap-4 mb-6">
                      <div>
                        <p className="text-sm uppercase tracking-[0.25em] text-[#B43108]">Relatório Executivo</p>
                        <h2 className="text-2xl md:text-3xl font-bold mt-2">Análise estratégica do time</h2>
                      </div>
                    </div>

                    <div className="space-y-4 text-[#E6E6E6] leading-relaxed">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => <h1 className="text-3xl font-bold mt-8 mb-4 text-[#F2F2F2]">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-2xl font-bold mt-7 mb-3 text-[#F2F2F2]">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-xl font-bold mt-6 mb-2 text-[#F2F2F2]">{children}</h3>,
                          p: ({ children }) => <p className="text-[#D7D7D7] mb-4">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="text-[#D7D7D7]">{children}</li>,
                          table: ({ children }) => <div className="overflow-auto my-6"><table className="w-full text-sm border-collapse">{children}</table></div>,
                          thead: ({ children }) => <thead className="border-b border-[#3A3A3A]">{children}</thead>,
                          th: ({ children }) => <th className="text-left py-3 pr-4 text-[#F2F2F2]">{children}</th>,
                          td: ({ children }) => <td className="py-3 pr-4 border-b border-[#2A2A2A] text-[#D7D7D7] align-top">{children}</td>,
                          strong: ({ children }) => <strong className="text-[#F2F2F2] font-semibold">{children}</strong>,
                        }}
                      >
                        {assessment}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}
          </>
        )}

        {!professionals.length && (
          <Card className="bg-[#111111] border-[#2A2A2A] rounded-2xl shadow-xl">
            <CardContent className="p-8 text-center text-[#CFCFCF]">
              <p>Envie a planilha padrão do autodiagnóstico para iniciar a análise.</p>
              <p className="mt-2 text-sm text-[#7A7A7A]">Escala: 1 = Não conheço | 2 = Conheço mas nunca usei | 3 = Uso mas preciso de ajuda | 4 = Uso sem dificuldades | 5 = Sou expert e referência no time.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
        
  );
}

  <Analytics />
  </>

function MetricCard({ icon, label, value }) {
  return (
    <Card className="bg-[#111111] border-[#2A2A2A] rounded-2xl shadow-xl">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-[#1A1A1A] text-[#B43108] border border-[#2A2A2A]">{icon}</div>
        <div>
          <p className="text-sm text-[#A7A7A7]">{label}</p>
          <p className="text-2xl font-bold text-[#F2F2F2]">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalysisCard({ title, icon, items, empty }) {
  return (
    <Card className="bg-[#111111] border-[#2A2A2A] rounded-2xl shadow-xl">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          {icon}
          <h2 className="text-lg font-bold">{title}</h2>
        </div>
        <div className="space-y-3">
          {items.length ? items.slice(0, 5).map((item) => (
            <div key={item.competency} className="p-3 rounded-xl bg-[#1A1A1A]">
              <p className="font-medium">{item.competency}</p>
              <p className="text-sm text-[#A7A7A7]">Média: {item.average} | Dispersão: {item.dispersion}</p>
            </div>
          )) : <p className="text-sm text-[#A7A7A7]">{empty}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function TrainingCard({ items }) {
  const uniqueTrainings = Array.from(new Map(items.map((item) => [item.training, item])).values());

  return (
    <Card className="bg-[#111111] border-[#2A2A2A] rounded-2xl shadow-xl">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="text-[#B43108]" />
          <h2 className="text-lg font-bold">Treinamentos sugeridos</h2>
        </div>
        <div className="space-y-3">
          {uniqueTrainings.length ? uniqueTrainings.slice(0, 5).map((item) => (
            <div key={item.training} className="p-3 rounded-xl bg-[#1A1A1A]">
              <p className="font-medium text-[#E66A3A]">{item.training}</p>
              <p className="text-sm text-[#A7A7A7]">Prioridade ligada a: {item.competency}</p>
            </div>
          )) : <p className="text-sm text-[#A7A7A7]">Não há treinamentos prioritários com base nas médias atuais.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
