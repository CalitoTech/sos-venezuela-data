import time
import json
import requests

def extract_personas():
    url = "https://desaparecidos-terremoto-api.theempire.tech/api/personas"
    page = 1
    page_size = 100
    all_personas = []
    
    print("Iniciando la extracción de personas desde la API...")
    
    while True:
        print(f"Solicitando página {page} con pageSize={page_size}...")
        
        try:
            # En cada iteración, haz una petición GET a la URL inyectando las variables page y pageSize
            response = requests.get(url, params={"page": page, "pageSize": page_size}, timeout=30)
            
            # Condición de salida: si la respuesta HTTP es diferente a 200
            if response.status_code != 200:
                print(f"Alerta: Respuesta HTTP diferente a 200 ({response.status_code}) en la página {page}. Terminando extracción.")
                break
            
            # Decodificación JSON
            data = response.json()
            
            # Obtener el arreglo de personas
            # En la estructura de la API, los registros están bajo la clave 'items'
            items = data.get("items")
            
            # Condición de salida: si el arreglo de datos devuelto está vacío o no existe
            if not items:
                print(f"El arreglo de datos está vacío o no contiene registros en la página {page}. Terminando extracción.")
                break
                
            # Agregar los registros de personas a la lista principal
            all_personas.extend(items)
            print(f"Página {page} procesada exitosamente. Registros en esta página: {len(items)}. Total acumulado: {len(all_personas)}")
            
            # Incrementar la variable page en 1
            page += 1
            
        except requests.RequestException as req_err:
            print(f"Error de conexión o de red en la página {page}: {req_err}")
            break
        except ValueError as json_err:
            print(f"Error de decodificación JSON en la página {page}: {json_err}")
            break
        
        # Incluye un time.sleep(0.5) al final de cada iteración
        time.sleep(0.5)

    # Guarda la lista completa en un archivo llamado desaparecidos_terremoto.json con indent=4
    output_filename = "desaparecidos_terremoto.json"
    print(f"\nGuardando {len(all_personas)} registros en {output_filename}...")
    try:
        with open(output_filename, "w", encoding="utf-8") as f:
            json.dump(all_personas, f, indent=4, ensure_ascii=False)
        print("¡Proceso de guardado completado con éxito!")
    except Exception as e:
        print(f"Error al escribir el archivo de salida: {e}")

if __name__ == "__main__":
    extract_personas()
