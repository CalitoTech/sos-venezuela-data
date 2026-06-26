import os
import requests
import json
import time

def fetch_all_people():
    base_url = "https://encuentralos.tecnosoft.dev/api/personas"
    output_filename = "personas_api.json"
    limit = 100
    retries = 3

    print("Iniciando la extracción incremental de personas desde la API...")

    current_records = []
    offset = 0

    # 1. Comprobar archivo, detectar duplicados y el offset actual
    if os.path.exists(output_filename):
        try:
            with open(output_filename, "r", encoding="utf-8") as f:
                current_records = json.load(f)
            
            if isinstance(current_records, list):
                offset = len(current_records)
                print(f"Archivo {output_filename} encontrado con {offset} registros.")
                print(f"Detectando lote de continuación: offset={offset}.")
                
                # Buscar duplicados por el campo 'id'
                ids = [r.get("id") for r in current_records if isinstance(r, dict) and r.get("id")]
                seen_ids = set()
                duplicates = set()
                for record_id in ids:
                    if record_id in seen_ids:
                        duplicates.add(record_id)
                    seen_ids.add(record_id)
                
                if duplicates:
                    print(f"⚠️ ¡ALERTA! Se encontraron {len(duplicates)} IDs duplicados en el archivo local:")
                    print(list(duplicates)[:10], "... (truncado)" if len(duplicates) > 10 else "")
                else:
                    print("✅ No se detectaron IDs duplicados en el archivo local.")
            else:
                print(f"Contenido inválido en {output_filename}. Inicializando como lista vacía.")
                current_records = []
                with open(output_filename, "w", encoding="utf-8") as f:
                    json.dump([], f, indent=4, ensure_ascii=False)
        except Exception as e:
            print(f"Error al leer {output_filename}: {e}. Inicializando como lista vacía.")
            current_records = []
            with open(output_filename, "w", encoding="utf-8") as f:
                json.dump([], f, indent=4, ensure_ascii=False)
    else:
        print(f"Creando nuevo archivo {output_filename} inicializado como una lista vacía.")
        with open(output_filename, "w", encoding="utf-8") as f:
            json.dump([], f, indent=4, ensure_ascii=False)

    while True:
        url = f"{base_url}?limit={limit}&offset={offset}"
        
        response = None
        for attempt in range(retries):
            try:
                response = requests.get(url, timeout=15)
                response.raise_for_status()
                break  # Éxito, salir del bucle de reintento
            except requests.exceptions.RequestException as e:
                print(f"\n[Intento {attempt+1}/{retries}] Error en offset {offset}: {e}")
                if attempt < retries - 1:
                    time.sleep(2)
                else:
                    response = None

        if response is None:
            print(f"\nError persistente en offset {offset} tras {retries} intentos. Deteniendo.")
            break

        try:
            data = response.json()
        except ValueError:
            print(f"\nError: La respuesta en el offset {offset} no es un JSON válido.")
            break

        items = data.get("items")
        if not items:
            print("\nNo se encontraron más registros ('items' está vacío o no existe). Finalizando extracción.")
            break

        # Recargar para evitar pérdidas si hubo cambios externos
        try:
            with open(output_filename, "r", encoding="utf-8") as f:
                current_records = json.load(f)
        except Exception:
            pass

        current_records.extend(items)

        try:
            with open(output_filename, "w", encoding="utf-8") as f:
                json.dump(current_records, f, indent=4, ensure_ascii=False)
            
            # Informar el lote en el que va la descarga en cada iteración
            print(f"Lote procesado: offset={offset} | Total guardado: {len(current_records)}")
        except Exception as e:
            print(f"\nError al guardar los registros en el offset {offset}: {e}")
            break

        offset += limit
        time.sleep(0.5)

    try:
        with open(output_filename, "r", encoding="utf-8") as f:
            final_count = len(json.load(f))
    except Exception:
        final_count = 0

    print(f"\nProceso finalizado. Total acumulado en {output_filename}: {final_count} registros.")

if __name__ == "__main__":
    fetch_all_people()
