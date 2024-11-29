from fpdf import FPDF

# Criando a classe para o PDF
class PDF(FPDF):
    def header(self):
        self.set_font("DejaVu", "", 12)
        self.cell(0, 10, "Analise e Previsao de Posições Operacionais", ln=True, align="C")
        self.ln(10)

    def chapter_title(self, title):
        self.set_font("DejaVu", "B", 12)
        self.cell(0, 10, title, ln=True)
        self.ln(4)

    def chapter_body(self, body):
        self.set_font("DejaVu", "", 12)
        self.multi_cell(0, 10, body)
        self.ln()

# Criando uma instância do PDF
pdf = PDF()
pdf.add_page()

# Adicionando a fonte DejaVu
pdf.add_font('DejaVu', '', 'DejaVuSans.ttf', uni=True)
pdf.set_font('DejaVu', '', 12)

# Inserindo o conteúdo
pdf.chapter_title("1. Entender os Dados")
pdf.chapter_body(
    "Temos duas séries de dados:\n\n"
    "Demanda de voos por horário: Representa a quantidade de voos em diferentes horários durante o dia.\n"
    "Quantidade de posições operacionais ocupadas: Representa quantas posições operacionais estavam sendo usadas para controlar o tráfego aéreo nesses horários.\n"
    "Nosso objetivo é prever o número de posições operacionais necessárias com base na quantidade de voos prevista.\n"
)

pdf.chapter_title("2. Calcular a Correlação")
pdf.chapter_body(
    "Para entender a relação entre demanda de voos e posições operacionais, vamos calcular o coeficiente de correlação entre essas duas variáveis. Esse coeficiente vai indicar o quão forte é a relação entre o aumento de voos e o aumento de posições ocupadas.\n\n"
    "A correlação pode ser calculada usando a fórmula de correlação de Pearson:\n\n"
    "r = Σ(X - X̄)(Y - Ȳ) / sqrt[Σ(X - X̄)^2 * Σ(Y - Ȳ)^2]\n\n"
    "Onde:\n"
    "X representa a série de demanda de voos.\n"
    "Y representa a série de posições operacionais.\n"
    "X̄ e Ȳ são as médias de X e Y.\n"
)

pdf.chapter_title("3. Ajustar um Modelo Linear")
pdf.chapter_body(
    "Se a correlação for forte (por exemplo, maior que 0,7 ou menor que -0,7), podemos supor que há uma relação linear entre os voos e as posições operacionais. Isso significa que, conforme a demanda de voos aumenta ou diminui, o número de posições operacionais tende a aumentar ou diminuir de forma proporcional.\n\n"
    "Uma regressão linear simples pode ser usada para modelar essa relação. A fórmula de regressão linear é:\n\n"
    "Y = aX + b\n\n"
    "Onde:\n"
    "Y é o número previsto de posições operacionais.\n"
    "X é a demanda de voos.\n"
    "a é o coeficiente angular (representa o aumento de posições para cada aumento de um voo).\n"
    "b é o intercepto (valor de Y quando X=0).\n"
    "Esse modelo permite que você insira uma previsão de demanda de voos (X) e obtenha o número esperado de posições operacionais (Y).\n"
)

pdf.chapter_title("4. Fazer Previsões para Dias Futuros")
pdf.chapter_body(
    "Com o modelo ajustado, você pode inserir os valores de demanda de voos prevista para o dia 14/11/2024 e calcular o número estimado de posições operacionais.\n\n"
    "Exemplo Prático com Google Sheets:\n"
    "1. Organize os dados de demanda de voos e posições operacionais em duas colunas no Google Sheets.\n"
    "2. Use a função CORREL para calcular a correlação entre as duas colunas.\n"
    "3. Aplique a regressão linear:\n"
    "   - Use SLOPE para obter o coeficiente a.\n"
    "   - Use INTERCEPT para obter o coeficiente b.\n"
    "4. Com esses valores, aplique a fórmula de regressão para prever as posições operacionais com base na demanda de voos.\n"
)

# Salvando o PDF
pdf.output("analise_previsao_posicoes_operacionais.pdf")
