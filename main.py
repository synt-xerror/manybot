from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from webdriver_manager.chrome import ChromeDriverManager
import time
import pyperclip

GRUPO = "notes"
BOT_PREFIX = "🤖 *BOT:* "
PROFILE_DIR = "/home/syntax/whatsapp-profile"
CHECK_INTERVAL = 0.5

def iniciar_driver():
    print("[DRIVER] Iniciando Chrome...")
    opts = Options()
    opts.add_argument(f"--user-data-dir={PROFILE_DIR}")
    opts.add_argument("--profile-directory=Default")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-extensions")
    opts.add_argument("--disable-gpu")
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=opts)
    driver.get("https://web.whatsapp.com")
    wait = WebDriverWait(driver, 120)
    print("[DRIVER] Aguardando QR Code ou login...")
    wait.until(EC.presence_of_element_located((By.ID, "pane-side")))
    print("[DRIVER] WhatsApp Web carregado.")
    return driver, wait

def abrir_grupo(driver, wait):
    print(f"[GRUPO] Procurando '{GRUPO}'...")
    grupo_box = wait.until(EC.presence_of_element_located((By.XPATH, f'//span[@title="{GRUPO}"]')))
    grupo_box.click()
    print(f"[GRUPO] Aberto.")

def pegar_ultima_mensagem(driver):
    msgs = driver.find_elements(By.CSS_SELECTOR, "[data-testid='selectable-text'] span")
    if not msgs:
        return None
    return msgs[-1].text

def enviar_mensagem(driver, wait, texto):
    print(f"[ENVIO] Enviando: '{texto}'")
    caixa = wait.until(EC.element_to_be_clickable((
        By.CSS_SELECTOR, "footer div[contenteditable='true'][role='textbox']"
    )))
    caixa.click()

    pyperclip.copy(texto)
    caixa.send_keys(Keys.CONTROL, 'v')

    time.sleep(0.3)
    caixa.send_keys(Keys.ENTER)
    print("[ENVIO] Mensagem enviada.")

def bot_msg(texto):
    return f"{BOT_PREFIX}{texto}"

def processar_comando(texto):
    if texto == "!bot ping":
        return bot_msg("pong 🏓")
    return None

# -----------------------------
driver, wait = iniciar_driver()
abrir_grupo(driver, wait)
ultima_mensagem = None


while True:
    try:
        texto = pegar_ultima_mensagem(driver)
        if not texto or texto == ultima_mensagem:
            time.sleep(CHECK_INTERVAL)
            continue

        print(f"[MSG] Nova mensagem: '{texto}'")
        ultima_mensagem = texto
        time.sleep(CHECK_INTERVAL)

        resposta = processar_comando(texto)
        if resposta:
            enviar_mensagem(driver, wait, resposta)

    except Exception as e:
        print(f"[ERRO] {type(e).__name__}: {e}")
        time.sleep(1)