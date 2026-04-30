import { useState, useEffect } from 'react';
import './App.css';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Separator } from './components/ui/separator';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { supabase } from './supabaseClient';

import { 
  MapPin, 
  Clock, 
  Calendar, 
  Users, 
  CreditCard, 
  FileText, 
  Phone, 
  Mail,
  Heart,
  Gift,
  IceCream,
  CheckCircle,
  ArrowRight,
  User,
  X,
  Plus,
  Minus,
  UserPlus,
  Utensils,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Flower2,
  Cake
} from 'lucide-react';

function App() {
  // ⚙️ CONFIGURAÇÃO
  const SERIES_DISPONIVEIS = ['Grupo IV','Grupo V', 'Maternal(3)', 'Maternalzinho(2)', '1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano','6º Ano','7º Ano','8º Ano','9º Ano'];

  // ============================================
  // VALORES DAS SENHAS
  // ============================================
  const PRECO_MAE = 80.0;
  const PRECO_EXTRA = 40.0;

  // ============================================
  // DEADLINE - 12/05/2026 00:01 (Horário de Brasília UTC-3)
  // Em UTC: 12/05/2026 03:01
  // ============================================
  const DEADLINE_UTC = new Date('2026-05-12T03:01:00Z');

  // ============================================
  // TAXAS DE ANTECIPAÇÃO
  // ============================================
  const TAXA_ANTECIPACAO_VISTA = 0.0115;
  const TAXA_ANTECIPACAO_PARCELADO = 0.016;

  const calcularTaxaAntecipacao = (valorBase, numParcelas) => {
    if (numParcelas === 1) {
      return valorBase * TAXA_ANTECIPACAO_VISTA;
    } else {
      const somaMeses = (numParcelas * (numParcelas + 1)) / 2;
      const valorParcela = valorBase / numParcelas;
      return valorParcela * TAXA_ANTECIPACAO_PARCELADO * somaMeses;
    }
  };

  // ============================================
  // VERIFICAÇÃO DE DEADLINE (HORÁRIO DE BRASÍLIA)
  // ============================================
  const [inscricoesEncerradas, setInscricoesEncerradas] = useState(false);

  useEffect(() => {
    const verificarDeadline = () => {
      const agoraUTC = new Date();
      if (agoraUTC >= DEADLINE_UTC) {
        setInscricoesEncerradas(true);
      }
    };

    verificarDeadline();
    // Reverifica a cada minuto, caso o usuário deixe a página aberta
    const interval = setInterval(verificarDeadline, 60000);
    return () => clearInterval(interval);
  }, []);

  // Estados para o formulário
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    studentName: '',
    studentGrade: '',
    studentClass: '',
    parentName: '',
    cpf: '',
    email: '',
    phone: '',
    phoneConfirm: '',
    paymentMethod: 'pix',
    installments: 1,
    senhasMae: 1,        // Quantidade de senhas de Mãe (R$ 80)
    senhasExtras: 0      // Quantidade de senhas Extras (R$ 40)
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [inscriptionSuccess, setInscriptionSuccess] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState(null);
  
  // Estados para validação de CPF
  const [cpfError, setCpfError] = useState('');
  const [cpfValid, setCpfValid] = useState(false);

  // Estados para validação de telefone
  const [phoneError, setPhoneError] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);

  // Estados para busca de alunos no Supabase
  const [studentSearch, setStudentSearch] = useState('');
  const [studentsList, setStudentsList] = useState([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedSerie, setSelectedSerie] = useState('');

  // Função para validar CPF
  const validarCPF = (cpf) => {
    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    let soma = 0;
    let resto;
    for (let i = 1; i <= 9; i++) {
      soma += parseInt(cpf.substring(i-1, i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++) {
      soma += parseInt(cpf.substring(i-1, i)) * (12 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;
    return true;
  };

  // Formata telefone: (84) 99999-9999
  const formatarTelefone = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const telDigits = (v) => (v || '').replace(/\D/g, '');

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const showInscricaoForm = () => {
    setShowForm(true);
    setTimeout(() => {
      document.getElementById('formulario-inscricao')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Função para buscar alunos no Supabase
  const searchStudents = async (searchTerm) => {
    if (searchTerm.length < 2) {
      setStudentsList([]);
      setShowStudentDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      let query = supabase
        .from('alunos')
        .select('*')
        .ilike('nome_completo', `%${searchTerm}%`);
      
      if (selectedSerie) {
        query = query.eq('serie', selectedSerie);
      }

      const { data, error } = await query
        .order('nome_completo')
        .limit(10);

      if (error) throw error;
      
      setStudentsList(data || []);
      setShowStudentDropdown(data && data.length > 0);
    } catch (error) {
      console.error('Erro ao buscar alunos:', error);
      setStudentsList([]);
      setShowStudentDropdown(false);
    } finally {
      setIsSearching(false);
    }
  };

  const selectStudent = (student) => {
    setSelectedStudent(student);
    setFormData(prev => ({
      ...prev,
      studentName: student.nome_completo,
      studentGrade: student.serie,
      studentClass: student.turma
    }));
    setStudentSearch(student.nome_completo);
    setShowStudentDropdown(false);
    setStudentsList([]);
  };

  const handleStudentSearchChange = (e) => {
    const value = e.target.value;
    setStudentSearch(value);
    searchStudents(value);
    
    if (!value) {
      setSelectedStudent(null);
      setFormData(prev => ({
        ...prev,
        studentName: '',
        studentGrade: '',
        studentClass: ''
      }));
      setShowStudentDropdown(false);
    }
  };

  const clearStudentSelection = () => {
    setSelectedStudent(null);
    setStudentSearch('');
    setFormData(prev => ({
      ...prev,
      studentName: '',
      studentGrade: '',
      studentClass: ''
    }));
    setShowStudentDropdown(false);
    setStudentsList([]);
  };

  // ============================================
  // CÁLCULO DE PREÇO
  // Mãe = R$ 80,00 | Extra = R$ 40,00
  // Até 3x no cartão com juros
  // ============================================
  const calculatePrice = () => {
    const totalSenhas = (formData.senhasMae || 0) + (formData.senhasExtras || 0);
    let valorBase = (formData.senhasMae * PRECO_MAE) + (formData.senhasExtras * PRECO_EXTRA);
    let valorTotal = valorBase;
    
    if (formData.paymentMethod === 'credit' && valorBase > 0) {
      let taxaPercentual = 0;
      const taxaFixa = 0.49;
      const parcelas = parseInt(formData.installments) || 1;
      
      if (parcelas === 1) {
        taxaPercentual = 0.0299;
      } else if (parcelas >= 2 && parcelas <= 3) {
        taxaPercentual = 0.0349;
      }
      
      const taxaCartao = valorBase * taxaPercentual;
      const taxaAntecipacao = calcularTaxaAntecipacao(valorBase, parcelas);
      valorTotal = valorBase + taxaCartao + taxaFixa + taxaAntecipacao;
    }
    
    const valorParcela = valorTotal / (parseInt(formData.installments) || 1);
    return { valorBase, valorTotal, valorParcela, totalSenhas };
  };

  const { valorBase, valorTotal, valorParcela, totalSenhas } = calculatePrice();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'cpf') {
      const cpfValue = value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

      setFormData(prev => ({ ...prev, [name]: cpfValue }));
      
      const cpfSemMascara = cpfValue.replace(/[^\d]/g, '');
      
      if (cpfSemMascara.length === 0) {
        setCpfError('');
        setCpfValid(false);
      } else if (cpfSemMascara.length < 11) {
        setCpfError('CPF deve ter 11 dígitos');
        setCpfValid(false);
      } else if (cpfSemMascara.length === 11) {
        if (validarCPF(cpfSemMascara)) {
          setCpfError('');
          setCpfValid(true);
        } else {
          setCpfError('CPF inválido. Verifique os números digitados.');
          setCpfValid(false);
        }
      }

    } else if (name === 'phone') {
      const formatted = formatarTelefone(value);
      setFormData(prev => ({ ...prev, phone: formatted }));
      const digits = telDigits(formatted);

      if (!digits) {
        setPhoneError(''); setPhoneValid(false); return;
      }
      if (digits.length < 11) {
        setPhoneError('Telefone deve ter 11 dígitos com DDD'); setPhoneValid(false); return;
      }
      const confirmDigits = telDigits(formData.phoneConfirm);
      if (confirmDigits && confirmDigits !== digits) {
        setPhoneError('Os telefones não coincidem'); setPhoneValid(false);
      } else if (confirmDigits && confirmDigits === digits) {
        setPhoneError(''); setPhoneValid(true);
      } else {
        setPhoneError(''); setPhoneValid(false);
      }

    } else if (name === 'phoneConfirm') {
      const formatted = formatarTelefone(value);
      setFormData(prev => ({ ...prev, phoneConfirm: formatted }));
      const digits = telDigits(formatted);
      const originalDigits = telDigits(formData.phone);

      if (!digits) {
        setPhoneError(''); setPhoneValid(false); return;
      }
      if (digits !== originalDigits) {
        setPhoneError('Os telefones não coincidem'); setPhoneValid(false);
      } else if (digits.length === 11) {
        setPhoneError(''); setPhoneValid(true);
      }

    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validateForm = () => {
    if (!selectedStudent) {
      alert('Por favor, selecione um aluno da lista.');
      return false;
    }

    if (totalSenhas === 0) {
      alert('Por favor, selecione pelo menos uma senha (Mãe ou Extra).');
      return false;
    }

    const cpfSemMascara = formData.cpf.replace(/[^\d]/g, '');
    if (!cpfSemMascara || cpfSemMascara.length !== 11) {
      alert('Por favor, preencha um CPF válido.');
      return false;
    }
    if (!validarCPF(cpfSemMascara)) {
      alert('CPF inválido. Verifique os números digitados.');
      return false;
    }

    if (telDigits(formData.phone).length < 11) {
      alert('Por favor, preencha um WhatsApp válido com DDD.');
      return false;
    }
    if (telDigits(formData.phone) !== telDigits(formData.phoneConfirm)) {
      alert('Os telefones não coincidem. Verifique e tente novamente.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Verificação extra de deadline antes de submeter
    if (new Date() >= DEADLINE_UTC) {
      setInscricoesEncerradas(true);
      return;
    }

    if (!validateForm()) {
      return;
    }
    
    setIsProcessing(true);

    try {  
      const response = await fetch('https://webhook.escolaamadeus.com/webhook/amadeuseventos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentName: formData.studentName,
          studentGrade: formData.studentGrade,
          studentClass: formData.studentClass,
          parentName: formData.parentName,
          cpf: formData.cpf,
          email: formData.email,
          phone: formData.phone,
          paymentMethod: formData.paymentMethod,
          installments: formData.installments,
          senhasMae: formData.senhasMae,
          senhasExtras: formData.senhasExtras,
          ticketQuantity: totalSenhas,
          amount: valorTotal,
          timestamp: new Date().toISOString(),
          event: 'Amadeus-diadasmaes'
        })
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('Resposta do n8n:', responseData);
        
        if (responseData.success === false) {
          alert(responseData.message || 'Erro ao processar dados. Tente novamente.');
          return;
        }
        
        if (responseData.paymentUrl) {
          setPaymentUrl(responseData.paymentUrl);
          setInscriptionSuccess(true);
          window.location.href = responseData.paymentUrl;
        } else {
          alert('Erro: Link de pagamento não encontrado. Entre em contato conosco.');
        }
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Erro ao enviar dados para o servidor');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao processar inscrição. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================
  // TELA DE INSCRIÇÕES ENCERRADAS (após 11/05/2026)
  // ============================================
  if (inscricoesEncerradas) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-pink-200 shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 bg-pink-100 rounded-full w-fit">
              <XCircle className="h-12 w-12 text-pink-600" />
            </div>
            <CardTitle className="text-2xl text-pink-800">Inscrições Encerradas</CardTitle>
            <CardDescription className="text-base mt-2">
              O prazo para inscrições terminou em <strong>11 de maio de 2026</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
              <Heart className="h-6 w-6 text-pink-500 mx-auto mb-2" />
              <p className="text-sm text-gray-700">
                As lembrancinhas foram produzidas antecipadamente e a organização do evento já foi finalizada.
              </p>
            </div>
            <div className="pt-4 border-t border-pink-100">
              <p className="text-sm font-semibold text-gray-800 mb-2">
                Para mais informações:
              </p>
              <div className="flex items-center justify-center space-x-2 text-pink-700">
                <Phone className="h-4 w-4" />
                <span className="font-bold" translate="no">(84) 9 8145-0229</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Secretaria da Escola Amadeus
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (inscriptionSuccess) {
    return (
      <div className="min-h-screen bg-pink-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-pink-100 rounded-full w-fit">
              <CheckCircle className="h-8 w-8 text-pink-600" />
            </div>
            <CardTitle className="text-pink-600">Inscrição Registrada!</CardTitle>
            <CardDescription>Finalize o pagamento para garantir sua vaga</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Seus dados foram registrados com sucesso. Clique no botão abaixo para ir para a página de pagamento.
            </p>

            {paymentUrl && (
              <a
                href={paymentUrl}
                className="block w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-4 px-6 rounded-lg text-center text-lg transition-colors"
                style={{textDecoration: 'none'}}
              >
                💳 IR PARA O PAGAMENTO
              </a>
            )}

            <p className="text-xs text-gray-500">
              Se o botão não abrir, copie e cole o link abaixo no seu navegador:
            </p>

            {paymentUrl && (
              <div className="p-3 bg-gray-100 rounded border text-xs text-gray-700 break-all select-all cursor-text text-left">
                {paymentUrl}
              </div>
            )}

            <Button onClick={() => window.location.reload()} variant="outline" className="w-full mt-2">
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen smooth-scroll">
      <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm z-50 border-b">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold text-pink-800">Escola Amadeus</h1>
            <div className="hidden md:flex space-x-6">
              <button onClick={() => scrollToSection('sobre')} className="text-sm hover:text-pink-600 transition-colors">Sobre</button>
              <button onClick={() => scrollToSection('itinerario')} className="text-sm hover:text-pink-600 transition-colors">Informações</button>
              <button onClick={() => scrollToSection('custos')} className="text-sm hover:text-pink-600 transition-colors">Inscrição</button>
              <button onClick={() => scrollToSection('documentacao')} className="text-sm hover:text-pink-600 transition-colors">Importante</button>
              <button onClick={() => scrollToSection('contato')} className="text-sm hover:text-pink-600 transition-colors">Contato</button>
            </div>
          </div>
        </nav>
      </header>

      {/* HERO - Tom carinhoso/Dia das Mães */}
      <section className="hero-section min-h-screen flex items-center justify-center text-white relative bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="text-center z-10 max-w-4xl mx-auto px-4">
          <div className="flex justify-center mb-4">
            <Heart className="h-16 w-16 text-white animate-pulse" fill="white" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in">
            Dia das Mães
          </h1>
          <p className="text-xl md:text-2xl mb-4 opacity-95 italic">
            "Uma tarde linda e cheia de carinho para celebrar você"
          </p>
          <p className="text-base md:text-lg mb-8 opacity-90">
            Escola Amadeus — Comemoração especial para nossas mamães
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-pink-600 hover:bg-pink-50 px-8 py-3 bg-white"
              onClick={() => scrollToSection("sobre")}
            >
              Saiba Mais
            </Button>
            <Button 
              size="lg" 
              className="bg-white text-pink-600 hover:bg-pink-50 px-8 py-3 font-bold"
              onClick={() => scrollToSection("custos")}
            >
              Fazer Inscrição
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
          <div className="mt-12 flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 text-sm">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              <span translate="no">16 de Maio de 2026 (Sábado)</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              <span translate="no">15h</span>
            </div>
            <div className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Novo Auditório
            </div>
          </div>
        </div>
      </section>

      {/* SOBRE */}
      <section id="sobre" className="section-padding bg-white py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <div className="flex justify-center mb-4">
              <Flower2 className="h-12 w-12 text-pink-500" />
            </div>
            <h2 className="text-4xl font-bold mb-4 text-pink-800">Queridas Mamães...</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              A Escola Amadeus preparou uma tarde linda e cheia de carinho para celebrar 
              vocês, que são tão especiais em nossas vidas! Esperamos todas vocês para 
              comemorarmos juntos o Dia das Mães, em um momento repleto de <strong className="text-pink-600">amor, alegria 
              e muita emoção</strong> ao lado de seus filhos.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <h3 className="text-2xl font-semibold mb-8 text-pink-800 text-center">Preparamos tudo com muito carinho</h3>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="flex items-start space-x-3 p-5 bg-pink-50 rounded-lg border border-pink-100">
                <Gift className="h-6 w-6 text-pink-500 mt-1 flex-shrink-0" />
                <p><strong>7 Lembrancinhas especiais</strong> para as mamães</p>
              </div>
              <div className="flex items-start space-x-3 p-5 bg-pink-50 rounded-lg border border-pink-100">
                <IceCream className="h-6 w-6 text-pink-500 mt-1 flex-shrink-0" />
                <p><strong>Sorvetada</strong> deliciosa para refrescar a tarde</p>
              </div>
              <div className="flex items-start space-x-3 p-5 bg-pink-50 rounded-lg border border-pink-100">
                <Cake className="h-6 w-6 text-pink-500 mt-1 flex-shrink-0" />
                <p><strong>Algodão doce, pipoca e churros</strong> — para mães e seus filhos</p>
              </div>
              <div className="flex items-start space-x-3 p-5 bg-pink-50 rounded-lg border border-pink-100">
                <Utensils className="h-6 w-6 text-pink-500 mt-1 flex-shrink-0" />
                <p>A <strong>cantina</strong> também estará aberta durante o evento</p>
              </div>
              <div className="flex items-start space-x-3 p-5 bg-pink-50 rounded-lg border border-pink-100 md:col-span-2">
                <Heart className="h-6 w-6 text-pink-500 mt-1 flex-shrink-0" fill="currentColor" />
                <p>Uma tarde inesquecível, harmoniosa e <strong>cheia de amor</strong>!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INFORMAÇÕES DO EVENTO */}
      <section id="itinerario" className="section-padding bg-pink-50/50 py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-pink-800">Informações do Evento</h2>
            <p className="text-lg text-muted-foreground">
              Confira todos os detalhes da nossa comemoração
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="card-hover border-pink-100">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-pink-100 rounded-full w-fit">
                  <Calendar className="h-8 w-8 text-pink-600" />
                </div>
                <CardTitle>Data</CardTitle>
                <CardDescription translate="no">16 de Maio de 2026</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-center" translate="no">
                  Sábado
                </p>
              </CardContent>
            </Card>
            <Card className="card-hover border-pink-100">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-pink-100 rounded-full w-fit">
                  <Clock className="h-8 w-8 text-pink-600" />
                </div>
                <CardTitle>Horário</CardTitle>
                <CardDescription translate="no">15h</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-center">
                  Tarde de comemoração
                </p>
              </CardContent>
            </Card>
            <Card className="card-hover border-pink-100">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-pink-100 rounded-full w-fit">
                  <MapPin className="h-8 w-8 text-pink-600" />
                </div>
                <CardTitle>Local</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-center font-semibold">
                  Novo Auditório
                </p>
                <p className="text-xs text-center text-muted-foreground mt-1">
                  Escola Amadeus
                </p>
              </CardContent>
            </Card>
            <Card className="card-hover border-pink-100">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-pink-100 rounded-full w-fit">
                  <AlertTriangle className="h-8 w-8 text-pink-600" />
                </div>
                <CardTitle>Prazo de Inscrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-center font-semibold text-pink-700" translate="no">
                  Até 11/05/2026
                </p>
                <p className="text-xs text-center text-muted-foreground mt-1">
                  Após essa data não receberemos pagamentos
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* IMPORTANTE */}
      <section id="documentacao" className="section-padding bg-white py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-pink-800">IMPORTANTE - LEIA</h2>
          </div>

          <div className="mt-8 p-6 bg-pink-50 rounded-lg border border-pink-200">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm">
                    A comemoração acontecerá no dia <span translate="no">16/05/2026 (sábado), às 15h</span>, no <strong>Novo Auditório da Escola Amadeus</strong>.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm">
                    <strong>Filhos(as)</strong> dos alunos da escola são <strong>isentos</strong>, não será cobrada nenhuma taxa para eles participarem ao lado da mãe.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm">
                    Os valores arrecadados serão destinados às <strong>despesas da comemoração e dos itens preparados</strong> (lembrancinhas, sorvetada, algodão doce, pipoca, churros e ornamentação).
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm">
                    A <strong>cantina estará aberta</strong> durante todo o evento.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm text-red-700 font-semibold">
                    ⚠️ ATENÇÃO: O prazo final para pagamento é <span translate="no">11/05/2026</span>. Após essa data <strong>não será possível receber pagamentos</strong>, pois as lembrancinhas estão sendo produzidas antecipadamente.
                  </p>
                </div>
              </div>  
            </div>
          </div>
        </div>
      </section>

      {/* INSCRIÇÃO E PAGAMENTO */}
      <section id="custos" className="section-padding bg-pink-50/30 py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-pink-800">Inscrição e Pagamento</h2>
            <p className="text-lg text-muted-foreground">
              Garanta sua vaga até <strong className="text-pink-700" translate="no">11/05/2026</strong>
            </p>
          </div>

          <Card className="mb-8 border-pink-200">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-pink-700">Tabela de Valores</CardTitle>
              <CardDescription>Escolha quantas senhas deseja</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-pink-100 rounded-lg border-2 border-pink-300 text-center">
                  <Heart className="h-8 w-8 text-pink-600 mx-auto mb-2" fill="currentColor" />
                  <h4 className="font-bold text-pink-800">Mãe</h4>
                  <p className="text-2xl font-bold text-pink-700 mt-2" translate="no">R$ 80,00</p>
                  <p className="text-xs text-pink-600 mt-1">por mãe</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border-2 border-green-300 text-center">
                  <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h4 className="font-bold text-green-800">Filhos(as)</h4>
                  <p className="text-2xl font-bold text-green-700 mt-2">GRÁTIS</p>
                  <p className="text-xs text-green-600 mt-1">isentos</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300 text-center">
                  <UserPlus className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h4 className="font-bold text-blue-800">Senha Extra</h4>
                  <p className="text-2xl font-bold text-blue-700 mt-2" translate="no">R$ 40,00</p>
                  <p className="text-xs text-blue-600 mt-1">parentes convidados</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 text-pink-700">Destinação dos valores:</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-pink-500 mr-2" />
                      Lembrancinhas para as mamães
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-pink-500 mr-2" />
                      Sorvetada, algodão doce, pipoca e churros
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-pink-500 mr-2" />
                      Ornamentação do espaço
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-pink-500 mr-2" />
                      Demais despesas organizacionais
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-red-600">Informações importantes:</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <AlertTriangle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Prazo final: <strong translate="no">11/05/2026</strong></span>
                    </li>
                    <li className="flex items-start">
                      <AlertTriangle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Filhos(as) da escola são isentos de pagamento</span>
                    </li>
                    <li className="flex items-start">
                      <AlertTriangle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Parcelamento em até 3x no cartão (com juros)</span>
                    </li>
                    <li className="flex items-start">
                      <AlertTriangle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Após o pagamento, não será permitido reembolso</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <div className="text-center">
                {!showForm ? (
                  <Button 
                    size="lg" 
                    className="bg-pink-600 hover:bg-pink-700 px-8 py-3 text-white"
                    onClick={showInscricaoForm}
                  >
                    Realizar Inscrição e Pagamento
                    <Heart className="ml-2 h-5 w-5" fill="currentColor" />
                  </Button>
                ) : (
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="px-8 py-3 border-pink-300"
                    onClick={() => setShowForm(false)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Fechar Formulário
                  </Button>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {!showForm ? 'Preencha seus dados e escolha a forma de pagamento' : 'Clique acima para fechar o formulário'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* FORMULÁRIO DE INSCRIÇÃO */}
          {showForm && (
            <Card id="formulario-inscricao" className="border-pink-300 bg-pink-50/30">
              <CardHeader>
                <CardTitle className="flex items-center text-pink-800">
                  <Heart className="mr-2 h-5 w-5" fill="currentColor" />
                  Formulário de Inscrição
                </CardTitle>
                <CardDescription>
                  Preencha todos os dados para garantir sua participação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* BUSCA DE ALUNO */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Search className="mr-2 h-5 w-5" />
                      Buscar Aluno (Filho/Filha)
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="relative">
                        <Label htmlFor="studentSearch">Digite o nome do aluno *</Label>
                        <Input
                          id="studentSearch"
                          name="studentSearch"
                          value={studentSearch}
                          onChange={handleStudentSearchChange}
                          onFocus={() => studentsList.length > 0 && setShowStudentDropdown(true)}
                          required
                          placeholder="Digite pelo menos 2 letras para buscar..."
                          autoComplete="off"
                          className={selectedStudent ? 'border-green-500 bg-green-50' : ''}
                        />
                        
                        {isSearching && (
                          <div className="absolute right-3 top-9">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-600"></div>
                          </div>
                        )}
                        
                        {selectedStudent && (
                          <div className="mt-2 p-3 bg-green-100 rounded border border-green-300 flex items-center justify-between">
                            <div>
                              <span className="text-sm text-green-800 font-medium block">
                                ✓ Aluno selecionado: {selectedStudent.nome_completo}
                              </span>
                              <span className="text-xs text-green-700">
                                {selectedStudent.serie} - Turma {selectedStudent.turma}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={clearStudentSelection}
                              className="h-8 text-red-600 hover:text-red-800 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        {/* Dropdown de resultados */}
                        {showStudentDropdown && studentsList.length > 0 && !selectedStudent && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                            {studentsList.map((student) => (
                              <div
                                key={student.id}
                                onClick={() => selectStudent(student)}
                                className="p-3 hover:bg-pink-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                              >
                                <div className="font-medium text-sm">{student.nome_completo}</div>
                                <div className="text-xs text-gray-600 mt-1">
                                  {student.serie} - Turma {student.turma}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {studentSearch.length >= 2 && studentsList.length === 0 && !selectedStudent && !isSearching && (
                          <div className="mt-2 p-3 bg-yellow-50 rounded border border-yellow-200">
                            <p className="text-sm text-yellow-800 flex items-center">
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              Nenhum aluno encontrado. Verifique o nome digitado.
                            </p>
                          </div>
                        )}

                        {studentSearch.length < 2 && studentSearch.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Digite pelo menos 2 letras para buscar
                          </p>
                        )}
                      </div>

                      {/* Campos preenchidos automaticamente */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="studentGrade">Série do Aluno *</Label>
                          <Input
                            id="studentGrade"
                            name="studentGrade"
                            value={formData.studentGrade}
                            disabled
                            className="bg-gray-100 cursor-not-allowed"
                            placeholder="Será preenchido automaticamente"
                          />
                        </div>
                        <div>
                          <Label htmlFor="studentClass">Turma do Aluno *</Label>
                          <Input
                            id="studentClass"
                            name="studentClass"
                            value={formData.studentClass}
                            disabled
                            className="bg-gray-100 cursor-not-allowed"
                            placeholder="Será preenchido automaticamente"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dados do Responsável */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Mail className="mr-2 h-5 w-5" />
                      Dados do Responsável
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="parentName">Nome do Responsável *</Label>
                        <Input
                          id="parentName"
                          name="parentName"
                          value={formData.parentName}
                          onChange={handleInputChange}
                          required
                          placeholder="Nome completo do responsável"
                        />
                      </div>

                      {/* TELEFONE COM CONFIRMAÇÃO */}
                      <div className="p-4 rounded-lg border-2 border-pink-200 bg-pink-50 space-y-3">
                        <p className="text-sm font-semibold text-pink-800 flex items-center">
                          <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                          📲 O QR Code do ingresso será enviado para este WhatsApp — digite com atenção!
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="phone">WhatsApp *</Label>
                            <Input
                              id="phone"
                              name="phone"
                              value={formData.phone}
                              onChange={handleInputChange}
                              required
                              placeholder="(84) 99999-9999"
                              maxLength="15"
                              className={
                                formData.phone && phoneError
                                  ? 'border-red-500 bg-red-50'
                                  : formData.phone && phoneValid
                                  ? 'border-green-500 bg-green-50'
                                  : ''
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="phoneConfirm">Confirme o WhatsApp *</Label>
                            <Input
                              id="phoneConfirm"
                              name="phoneConfirm"
                              value={formData.phoneConfirm}
                              onChange={handleInputChange}
                              required
                              placeholder="(84) 99999-9999"
                              maxLength="15"
                              className={
                                formData.phoneConfirm && phoneError
                                  ? 'border-red-500 bg-red-50'
                                  : formData.phoneConfirm && phoneValid
                                  ? 'border-green-500 bg-green-50'
                                  : ''
                              }
                            />
                          </div>
                        </div>
                        {phoneError && (
                          <p className="text-red-600 text-sm font-medium flex items-center">
                            <span className="mr-1">⚠️</span> {phoneError}
                          </p>
                        )}
                        {phoneValid && (
                          <p className="text-green-700 text-sm font-medium flex items-center">
                            ✅ WhatsApp confirmado! O QR Code será enviado para <strong className="ml-1">{formData.phone}</strong>
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="email">E-mail *</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            placeholder="seu@email.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cpf">CPF do Responsável *</Label>
                          <Input
                            id="cpf"
                            name="cpf"
                            value={formData.cpf}
                            onChange={handleInputChange}
                            required
                            placeholder="000.000.000-00"
                            maxLength="14"
                            className={`${
                              formData.cpf && cpfError 
                                ? 'border-red-500 bg-red-50' 
                                : formData.cpf && cpfValid 
                                ? 'border-green-500 bg-green-50' 
                                : ''
                            }`}
                          />
                          {cpfError && (
                            <p className="text-red-500 text-sm mt-1 flex items-center">
                              <span className="mr-1">⚠️</span>
                              {cpfError}
                            </p>
                          )}
                          {cpfValid && !cpfError && (
                            <p className="text-green-600 text-sm mt-1 flex items-center">
                              <span className="mr-1">✅</span>
                              CPF válido
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* QUANTIDADE DE SENHAS - DUAS CATEGORIAS */}
                  <div>
                    <h3 className="text-lg font-semibold mb-1 flex items-center">
                      <Users className="mr-2 h-5 w-5" />
                      Quantidade de Senhas
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Selecione quantas senhas deseja adquirir. <strong>Filhos(as) da escola não pagam</strong>.
                    </p>

                    {/* SENHA DE MÃE */}
                    <div className="flex items-center justify-between bg-pink-50 border-2 border-pink-300 rounded-lg p-4 mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-pink-200 rounded-full">
                          <Heart className="h-5 w-5 text-pink-700" fill="currentColor" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-pink-800">Senha de Mãe</p>
                          <p className="text-xs text-pink-700" translate="no">R$ 80,00 por mãe</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full border-pink-400 text-pink-600 hover:bg-pink-100"
                          onClick={() => setFormData(prev => ({ ...prev, senhasMae: Math.max(0, prev.senhasMae - 1), installments: 1 }))}
                          disabled={formData.senhasMae <= 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-xl font-bold w-8 text-center text-pink-800">
                          {formData.senhasMae}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full border-pink-400 text-pink-600 hover:bg-pink-100"
                          onClick={() => setFormData(prev => ({ ...prev, senhasMae: prev.senhasMae + 1, installments: 1 }))}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* SENHA EXTRA */}
                    <div className="flex items-center justify-between bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-200 rounded-full">
                          <UserPlus className="h-5 w-5 text-blue-700" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-blue-800">Senha Extra</p>
                          <p className="text-xs text-blue-700" translate="no">R$ 40,00 por parente convidado</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full border-blue-400 text-blue-600 hover:bg-blue-100"
                          onClick={() => setFormData(prev => ({ ...prev, senhasExtras: Math.max(0, prev.senhasExtras - 1), installments: 1 }))}
                          disabled={formData.senhasExtras <= 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="text-xl font-bold w-8 text-center text-blue-800">
                          {formData.senhasExtras}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full border-blue-400 text-blue-600 hover:bg-blue-100"
                          onClick={() => setFormData(prev => ({ ...prev, senhasExtras: prev.senhasExtras + 1, installments: 1 }))}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {totalSenhas === 0 && (
                      <p className="text-xs text-red-600 mt-2 flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Selecione pelo menos uma senha para continuar
                      </p>
                    )}

                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-green-800">
                        <strong>Lembrete:</strong> Filhos(as) dos alunos da escola são <strong>isentos</strong> e não precisam de senha.
                      </p>
                    </div>
                  </div>

                  {/* Método de Pagamento */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Método de Pagamento*</h3>
                    
                    <div className="space-y-3 mb-6">
                      <div 
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          formData.paymentMethod === 'pix' 
                            ? 'border-pink-400 bg-pink-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'pix', installments: 1 }))}
                      >
                        <div className="flex items-center">
                          <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                            formData.paymentMethod === 'pix' ? 'border-pink-400 bg-pink-400' : 'border-gray-300'
                          }`}>
                            {formData.paymentMethod === 'pix' && (
                              <div className="w-full h-full rounded-full bg-pink-400"></div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-lg font-bold">PIX</span>
                            <span className="text-sm" translate="no">
                              R$ {valorBase.toFixed(2).replace('.', ',')} (sem taxas)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div 
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          formData.paymentMethod === 'credit' 
                            ? 'border-pink-400 bg-pink-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'credit' }))}
                      >
                        <div className="flex items-center">
                          <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                            formData.paymentMethod === 'credit' ? 'border-pink-400 bg-pink-400' : 'border-gray-300'
                          }`}>
                            {formData.paymentMethod === 'credit' && (
                              <div className="w-full h-full rounded-full bg-pink-400"></div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm">💳</span>
                              <span className="text-sm font-medium">Cartão de Crédito</span>
                            </div>
                            <div className="text-xs text-green-600 ml-6 font-medium">
                              Parcele em até 3x (com juros)
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {formData.paymentMethod === 'credit' && totalSenhas > 0 && (
                      <div className="mb-6">
                        <Label className="text-sm font-medium">Número de Parcelas</Label>
                        <select
                          value={formData.installments}
                          onChange={(e) => setFormData(prev => ({ ...prev, installments: parseInt(e.target.value) }))}
                          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mt-2"
                        >
                          <option value={1}>1x de R$ {valorTotal.toFixed(2).replace('.', ',')}</option>
                          <option value={2}>2x de R$ {(valorTotal / 2).toFixed(2).replace('.', ',')}</option>
                          <option value={3}>3x de R$ {(valorTotal / 3).toFixed(2).replace('.', ',')}</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          * Taxas de cartão aplicadas ao valor total
                        </p>
                      </div>
                    )}

                    {/* Valor Total */}
                    <div className="bg-pink-100 p-4 rounded-lg border border-pink-200">
                      <div className="text-center" translate="no">
                        <h4 className="text-lg font-bold text-pink-800 mb-1">Valor Total</h4>
                        <div className="text-sm text-gray-700 mb-1 space-y-1">
                          {formData.senhasMae > 0 && (
                            <div>
                              {formData.senhasMae} {formData.senhasMae === 1 ? 'Senha de Mãe' : 'Senhas de Mãe'} × R$ 80,00
                            </div>
                          )}
                          {formData.senhasExtras > 0 && (
                            <div>
                              {formData.senhasExtras} {formData.senhasExtras === 1 ? 'Senha Extra' : 'Senhas Extras'} × R$ 40,00
                            </div>
                          )}
                          {formData.paymentMethod === 'credit' && totalSenhas > 0 && (
                            <div className="text-xs">+ taxas do cartão</div>
                          )}
                        </div>
                        <div className="text-3xl font-bold text-pink-900 mt-2">
                          R$ {valorTotal.toFixed(2).replace('.', ',')}
                        </div>
                        {formData.paymentMethod === 'credit' && formData.installments > 1 && (
                          <div className="text-sm text-pink-700 mt-1">
                            {formData.installments}x de R$ {valorParcela.toFixed(2).replace('.', ',')}
                          </div>
                        )}
                        {formData.paymentMethod === 'credit' && (
                          <div className="text-xs text-pink-600 mt-1">
                            (inclui taxas do cartão)
                          </div>
                        )}
                        <div className="mt-2 pt-2 border-t border-pink-300 text-xs text-pink-700 flex items-center justify-center">
                          <Heart className="h-3 w-3 mr-1" fill="currentColor" />
                          Filhos(as) da escola: entrada gratuita
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botão de Envio */}
                  <Button 
                    type="submit" 
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white py-6 text-lg font-bold"
                    disabled={isProcessing || !selectedStudent || !phoneValid || totalSenhas === 0}
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processando Inscrição...
                      </>
                    ) : (
                      <>
                        <Heart className="mr-2 h-5 w-5" fill="currentColor" />
                        CONTINUAR PARA PAGAMENTO
                      </>
                    )}
                  </Button>

                  {!phoneValid && formData.phone && (
                    <p className="text-xs text-center text-red-500">
                      ⚠️ Confirme o WhatsApp corretamente para habilitar o botão
                    </p>
                  )}

                  {totalSenhas === 0 && (
                    <p className="text-xs text-center text-red-500">
                      ⚠️ Selecione pelo menos uma senha (Mãe ou Extra)
                    </p>
                  )}

                  <p className="text-xs text-center text-gray-600">
                    Ao finalizar, você será redirecionado para o pagamento via Asaas
                  </p>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* CONTATO */}
      <section id="contato" className="section-padding bg-pink-50/50 py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-pink-800">Entre em Contato</h2>
            <p className="text-lg text-muted-foreground">
              Tire suas dúvidas conosco
            </p>
          </div>

          <div className="grid md:grid-cols-1 gap-8 max-w-md mx-auto">
            <Card className="card-hover border-pink-100">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Phone className="h-8 w-8 text-pink-600" />
                  <div>
                    <CardTitle>Telefone</CardTitle>
                    <CardDescription>Secretaria da escola</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold" translate="no">(84) 9 8145-0229</p>
                <p className="text-sm text-muted-foreground">
                  Horário de atendimento: <span translate="no">7h às 19h</span>
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              <strong>Coordenação Pedagógica</strong><br />
              Escola Centro Educacional Amadeus - São Gonçalo do Amarante, RN
            </p>
            <p className="text-sm text-pink-700 mt-4 italic">
              Com carinho, Escola Amadeus 💕
            </p>
          </div>
        </div>
      </section>

      <footer className="bg-pink-800 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <Heart className="h-6 w-6 mx-auto mb-2 text-pink-200" fill="currentColor" />
          <p className="text-sm">
            © 2026 Escola Centro Educacional Amadeus. Todos os direitos reservados.
          </p>
          <p className="text-xs mt-2 opacity-80" translate="no">
            Comemoração do Dia das Mães - 16 de Maio de 2026 - Novo Auditório
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
