import os
import re

files_to_fix = [
    "load_midi.yaml", "load_netcdf.yaml", "load_nifti.yaml", "load_orc.yaml",
    "load_pajek.yaml", "load_parquet.yaml", "load_pdb.yaml", "load_pdf.yaml",
    "load_pickle.yaml", "load_pytorch_geometric.yaml", "load_shapefile.yaml",
    "load_sqlite.yaml", "load_text_corpus.yaml", "load_tfrecords.yaml",
    "load_torchvision.yaml", "load_vcf.yaml", "load_video.yaml",
    "load_webdataset.yaml", "load_xml.yaml", "load_yaml.yaml"
]

replacements = {
    "load_midi.yaml": {
        "code": """import pandas as pd
import time
import os

try:
    import mido
except ImportError:
    print("[ERREUR LOAD] Le module 'mido' est requis (pip install mido).")
    raise

# [PARAM: FILE_PATH | file]
FILE_PATH = "./data/raw/music.mid"

print(f"[LOAD] Lecture du fichier MIDI : {FILE_PATH}...")
if not os.path.exists(FILE_PATH):
    raise FileNotFoundError(f"[ERREUR LOAD] Fichier introuvable : {FILE_PATH}")

try:
    start_time = time.time()
    mid = mido.MidiFile(FILE_PATH)
    events = []
    for msg in mid:
        events.append(msg.dict())
    
    df = pd.DataFrame(events)
    duration = time.time() - start_time
    print(f"[LOAD] Succès MIDI. {len(df)} événements chargés en {duration:.2f}s.")
except Exception as e:
    print(f"[ERREUR LOAD] Erreur de lecture MIDI : {str(e)}")
    raise e

target_name = None
task_type = "unknown"
meta = {"source": "midi", "path": FILE_PATH, "ticks_per_beat": mid.ticks_per_beat}""",
        "mermaid": """flowchart TD
    A([MIDI File]) --> B{mido.MidiFile}
    B --> C[Parse Events]
    C --> D[(df)]
    D --> E{{Set Variables}}
    E --> F([target_name, task_type, meta])
    style A fill:#f97316,stroke:#c2410c,stroke-width:2px,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style D fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    style E fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff"""
    },
    "load_netcdf.yaml": {
        "code": """import pandas as pd
import time
import os

try:
    import xarray as xr
except ImportError:
    print("[ERREUR LOAD] Le module 'xarray' est requis (pip install xarray netCDF4).")
    raise

# [PARAM: FILE_PATH | file]
FILE_PATH = "./data/raw/climate.nc"

print(f"[LOAD] Lecture du fichier NetCDF : {FILE_PATH}...")
if not os.path.exists(FILE_PATH):
    raise FileNotFoundError(f"[ERREUR LOAD] Fichier introuvable : {FILE_PATH}")

try:
    start_time = time.time()
    dataset = xr.open_dataset(FILE_PATH)
    df = dataset.to_dataframe().reset_index()
    duration = time.time() - start_time
    print(f"[LOAD] Succès NetCDF. {len(df)} lignes chargées en {duration:.2f}s.")
except Exception as e:
    print(f"[ERREUR LOAD] Erreur de lecture NetCDF : {str(e)}")
    raise e

target_name = None
task_type = "unknown"
meta = {"source": "netcdf", "path": FILE_PATH, "dims": list(dataset.dims)}""",
        "mermaid": """flowchart TD
    A([NetCDF File]) --> B{xr.open_dataset}
    B --> C[To DataFrame]
    C --> D[(df)]
    D --> E{{Set Variables}}
    E --> F([target_name, task_type, meta])
    style A fill:#f97316,stroke:#c2410c,stroke-width:2px,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style D fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    style E fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff"""
    },
    "load_nifti.yaml": {
        "code": """import numpy as np
import time
import os

try:
    import nibabel as nib
except ImportError:
    print("[ERREUR LOAD] Le module 'nibabel' est requis (pip install nibabel).")
    raise

# [PARAM: FILE_PATH | file]
FILE_PATH = "./data/raw/brain.nii.gz"

print(f"[LOAD] Lecture du fichier NIfTI : {FILE_PATH}...")
if not os.path.exists(FILE_PATH):
    raise FileNotFoundError(f"[ERREUR LOAD] Fichier introuvable : {FILE_PATH}")

try:
    start_time = time.time()
    img = nib.load(FILE_PATH)
    data = img.get_fdata()
    df = None 
    duration = time.time() - start_time
    print(f"[LOAD] Succès NIfTI. Volume shape {data.shape} chargé en {duration:.2f}s.")
except Exception as e:
    print(f"[ERREUR LOAD] Erreur de lecture NIfTI : {str(e)}")
    raise e

target_name = None
task_type = "medical_imaging"
meta = {"source": "nifti", "path": FILE_PATH, "shape": data.shape, "affine": img.affine.tolist()}""",
        "mermaid": """flowchart TD
    A([NIfTI File]) --> B{nib.load}
    B --> C[get_fdata]
    C --> D[(df=None, data in meta)]
    D --> E{{Set Variables}}
    E --> F([target_name, task_type, meta])
    style A fill:#f97316,stroke:#c2410c,stroke-width:2px,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style D fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    style E fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff"""
    },
    "load_orc.yaml": {
        "code": """import pandas as pd
import time
import os

# [PARAM: FILE_PATH | file]
FILE_PATH = "./data/raw/data.orc"

print(f"[LOAD] Lecture du fichier ORC : {FILE_PATH}...")
if not os.path.exists(FILE_PATH):
    raise FileNotFoundError(f"[ERREUR LOAD] Fichier introuvable : {FILE_PATH}")

try:
    start_time = time.time()
    df = pd.read_orc(FILE_PATH)
    duration = time.time() - start_time
    print(f"[LOAD] Succès ORC. {len(df)} lignes chargées en {duration:.2f}s.")
except Exception as e:
    print(f"[ERREUR LOAD] Erreur de lecture ORC : {str(e)}")
    raise e

target_name = None
task_type = "unknown"
meta = {"source": "orc", "path": FILE_PATH, "shape": df.shape}""",
        "mermaid": """flowchart TD
    A([ORC File]) --> B{pd.read_orc}
    B --> C[(df)]
    C --> D{{Set Variables}}
    D --> E([target_name, task_type, meta])
    style A fill:#f97316,stroke:#c2410c,stroke-width:2px,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style C fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    style D fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff"""
    },
    "load_pajek.yaml": {
        "code": """import pandas as pd
import numpy as np
import time

try:
    import networkx as nx
except ImportError:
    nx = None
    print("[ERREUR LOAD] 'networkx' n'est pas installé.")

# [PARAM: FILE_PATH | file]
FILE_PATH = "./data/raw/graph.net"

print(f"[LOAD] Lecture du fichier Pajek : {FILE_PATH}...")
if nx is None:
    raise ImportError("networkx requis")
    
try:
    start_time = time.time()
    G = nx.read_pajek(FILE_PATH)
    # Extract node attributes to df
    node_data = dict(G.nodes(data=True))
    df = pd.DataFrame.from_dict(node_data, orient='index')
    if df.empty:
        df = pd.DataFrame(index=list(G.nodes()))
    
    # Extract edges
    edge_index = np.array(list(G.edges())).T
    duration = time.time() - start_time
    print(f"[LOAD] Succès Pajek. {len(df)} noeuds chargés en {duration:.2f}s.")
except Exception as e:
    print(f"[ERREUR LOAD] Erreur de lecture Pajek : {str(e)}")
    raise e

target_name = None
task_type = "unknown"
meta = {"source": "pajek", "path": FILE_PATH, "edge_index": edge_index}""",
        "mermaid": """flowchart TD
    A([Pajek File]) --> B{nx.read_pajek}
    B --> C[(df Nodes)]
    B --> D{{meta edge_index}}
    C --> E{{Set Variables}}
    E --> F([target_name, task_type, meta])
    style A fill:#f97316,stroke:#c2410c,stroke-width:2px,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style C fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    style E fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff"""
    },
    "load_parquet.yaml": {
        "code": """import pandas as pd
import time
import os

# [PARAM: FILE_PATH | file]
FILE_PATH = "./data/raw/data.parquet"

print(f"[LOAD] Lecture du fichier Parquet : {FILE_PATH}...")
if not os.path.exists(FILE_PATH):
    raise FileNotFoundError(f"[ERREUR LOAD] Fichier introuvable : {FILE_PATH}")

try:
    start_time = time.time()
    df = pd.read_parquet(FILE_PATH)
    duration = time.time() - start_time
    print(f"[LOAD] Succès Parquet. {len(df)} lignes chargées en {duration:.2f}s.")
except Exception as e:
    print(f"[ERREUR LOAD] Erreur de lecture Parquet : {str(e)}")
    raise e

target_name = None
task_type = "unknown"
meta = {"source": "parquet", "path": FILE_PATH, "shape": df.shape}""",
        "mermaid": """flowchart TD
    A([Parquet File]) --> B{pd.read_parquet}
    B --> C[(df)]
    C --> D{{Set Variables}}
    D --> E([target_name, task_type, meta])
    style A fill:#f97316,stroke:#c2410c,stroke-width:2px,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style C fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    style D fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff"""
    },
    "load_pdb.yaml": {
        "code": """import time
import os

try:
    from Bio.PDB import PDBParser
except ImportError:
    print("[ERREUR LOAD] Le module 'biopython' est requis (pip install biopython).")
    raise

# [PARAM: FILE_PATH | file]
FILE_PATH = "./data/raw/protein.pdb"

print(f"[LOAD] Lecture du fichier PDB : {FILE_PATH}...")
if not os.path.exists(FILE_PATH):
    raise FileNotFoundError(f"[ERREUR LOAD] Fichier introuvable : {FILE_PATH}")

try:
    start_time = time.time()
    parser = PDBParser(QUIET=True)
    structure = parser.get_structure("protein", FILE_PATH)
    
    atoms = []
    for model in structure:
        for chain in model:
            for residue in chain:
                for atom in residue:
                    atoms.append({
                        "chain": chain.id,
                        "residue": residue.resname,
                        "atom": atom.name,
                        "x": atom.coord[0],
                        "y": atom.coord[1],
                        "z": atom.coord[2]
                    })
    import pandas as pd
    df = pd.DataFrame(atoms)
    duration = time.time() - start_time
    print(f"[LOAD] Succès PDB. {len(df)} atomes chargés en {duration:.2f}s.")
except Exception as e:
    print(f"[ERREUR LOAD] Erreur de lecture PDB : {str(e)}")
    raise e

target_name = None
task_type = "unknown"
meta = {"source": "pdb", "path": FILE_PATH, "shape": df.shape}""",
        "mermaid": """flowchart TD
    A([PDB File]) --> B{PDBParser}
    B --> C[Extract Atoms]
    C --> D[(df)]
    D --> E{{Set Variables}}
    E --> F([target_name, task_type, meta])
    style A fill:#f97316,stroke:#c2410c,stroke-width:2px,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style D fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    style E fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff"""
    },
    "load_pdf.yaml": {
        "code": """import time
import os
import pandas as pd

try:
    import PyPDF2
except ImportError:
    print("[ERREUR LOAD] Le module 'PyPDF2' est requis (pip install PyPDF2).")
    raise

# [PARAM: FILE_PATH | file]
FILE_PATH = "./data/raw/document.pdf"

print(f"[LOAD] Lecture du fichier PDF : {FILE_PATH}...")
if not os.path.exists(FILE_PATH):
    raise FileNotFoundError(f"[ERREUR LOAD] Fichier introuvable : {FILE_PATH}")

try:
    start_time = time.time()
    pages = []
    with open(FILE_PATH, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        for i, page in enumerate(reader.pages):
            pages.append({"page": i + 1, "text": page.extract_text()})
    
    df = pd.DataFrame(pages)
    duration = time.time() - start_time
    print(f"[LOAD] Succès PDF. {len(df)} pages chargées en {duration:.2f}s.")
except Exception as e:
    print(f"[ERREUR LOAD] Erreur de lecture PDF : {str(e)}")
    raise e

target_name = None
task_type = "nlp"
meta = {"source": "pdf", "path": FILE_PATH, "shape": df.shape}""",
        "mermaid": """flowchart TD
    A([PDF File]) --> B{PyPDF2.PdfReader}
    B --> C[Extract Text]
    C --> D[(df)]
    D --> E{{Set Variables}}
    E --> F([target_name, task_type, meta])
    style A fill:#f97316,stroke:#c2410c,stroke-width:2px,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style D fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    style E fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff"""
    },
    "load_pickle.yaml": {
        "code": """import time
import os
import pickle
import pandas as pd

# [PARAM: FILE_PATH | file]
FILE_PATH = "./data/raw/data.pkl"

print(f"[LOAD] Lecture du fichier Pickle : {FILE_PATH}...")
if not os.path.exists(FILE_PATH):
    raise FileNotFoundError(f"[ERREUR LOAD] Fichier introuvable : {FILE_PATH}")

try:
    start_time = time.time()
    with open(FILE_PATH, 'rb') as file:
        data = pickle.load(file)
    
    if isinstance(data, pd.DataFrame):
        df = data
    else:
        df = pd.DataFrame([data])
        
    duration = time.time() - start_time
    print(f"[LOAD] Succès Pickle. Chargé en {duration:.2f}s.")
except Exception as e:
    print(f"[ERREUR LOAD] Erreur de lecture Pickle : {str(e)}")
    raise e

target_name = None
task_type = "unknown"
meta = {"source": "pickle", "path": FILE_PATH, "type": str(type(data))}""",
        "mermaid": """flowchart TD
    A([Pickle File]) --> B{pickle.load}
    B --> C[(df)]
    C --> D{{Set Variables}}
    D --> E([target_name, task_type, meta])
    style A fill:#f97316,stroke:#c2410c,stroke-width:2px,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style C fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    style D fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff"""
    },
    "load_pytorch_geometric.yaml": {
        "code": """import pandas as pd
import numpy as np
import time

try:
    from torch_geometric.datasets import Planetoid
    import torch_geometric.transforms as T
except ImportError:
    Planetoid = None
    print("[ERREUR LOAD] 'torch_geometric' n'est pas installé.")

# [PARAM: DATASET_NAME | string]
DATASET_NAME = "Cora"
# [/PARAM]

print(f"[LOAD] Chargement du dataset PyG : {DATASET_NAME}...")
if Planetoid is None:
    raise ImportError("torch_geometric requis")

try:
    start_time = time.time()
    dataset = Planetoid(root='./data/raw/Planetoid', name=DATASET_NAME, transform=T.NormalizeFeatures())
    data = dataset[0]
    
    df = pd.DataFrame(data.x.numpy())
    df['target'] = data.y.numpy()
    
    edge_index = data.edge_index.numpy()
    duration = time.time() - start_time
    print(f"[LOAD] Succès PyG. {len(df)} noeuds en {duration:.2f}s.")
except Exception as e:
    print(f"[ERREUR LOAD] Erreur de chargement PyG : {str(e)}")
    raise e

target_name = "target"
task_type = "node_classification"
meta = {"source": "pytorch_geometric", "dataset": DATASET_NAME, "edge_index": edge_index}""",
        "mermaid": """flowchart TD
    A([PyG Dataset Name]) --> B{Planetoid Dataset}
    B --> C[(df Nodes)]
    B --> D{{meta edge_index}}
    C --> E{{Set Variables}}
    E --> F([target_name, task_type, meta])
    style A fill:#f97316,stroke:#c2410c,stroke-width:2px,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style C fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    style E fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff"""
    },
    "load_shapefile.yaml": {
        "code": """import time
import os
import pandas as pd

try:
    import geopandas as gpd
except ImportError:
    print("[ERREUR LOAD] Le module 'geopandas' est requis (pip install geopandas).")
    raise

# [PARAM: FILE_PATH | file]
FILE_PATH = "./data/raw/data.shp"

print(f"[LOAD] Lecture du Shapefile : {FILE_PATH}...")
if not os.path.exists(FILE_PATH):
    raise FileNotFoundError(f"[ERREUR LOAD] Fichier introuvable : {FILE_PATH}")

try:
    start_time = time.time()
    gdf = gpd.read_file(FILE_PATH)
    df = pd.DataFrame(gdf)
    duration = time.time() - start_time
    print(f"[LOAD] Succès Shapefile. {len(df)} géométries chargées en {duration:.2f}s.")
except Exception as e:
    print(f"[ERREUR LOAD] Erreur de lecture Shapefile : {str(e)}")
    raise e

target_name = None
task_type = "unknown"
meta = {"source": "Shapefile", "path": FILE_PATH, "shape": df.shape}""",
        "mermaid": """flowchart TD
    A([Shapefile]) --> B{gpd.read_file}
    B --> C[(df)]
    C --> D{{Set Variables}}
    D --> E([target_name, task_type, meta])
    style A fill:#f97316,stroke:#c2410c,stroke-width:2px,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style C fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    style D fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff"""
    },
    "load_sqlite.yaml": {
        "code": """import sqlite3
import pandas as pd
import time
import os

# [PARAM: FILE_PATH | file]
FILE_PATH = "./data/raw/database.db"
# [/PARAM]

# [PARAM: QUERY | string]
QUERY = "SELECT * FROM sqlite_master"
# [/PARAM]

print(f"[LOAD] Exécution requête sur SQLite : {FILE_PATH}...")
if not os.path.exists(FILE_PATH):
    raise FileNotFoundError(f"[ERREUR LOAD] Fichier introuvable : {FILE_PATH}")

try:
    start_time = time.time()
    with sqlite3.connect(FILE_PATH) as conn:
        df = pd.read_sql_query(QUERY, conn)
    duration = time.time() - start_time
    print(f"[LOAD] Succès SQLite. {len(df)} lignes chargées en {duration:.2f}s.")
except Exception as e:
    print(f"[ERREUR LOAD] Erreur SQLite : {str(e)}")
    raise e

target_name = None
task_type = "unknown"
meta = {"source": "SQLite", "path": FILE_PATH, "shape": df.shape}""",
        "mermaid": """flowchart TD
    A([SQLite DB]) --> B{pd.read_sql_query}
    B --> C[(df)]
    C --> D{{Set Variables}}
    D --> E([target_name, task_type, meta])
    style A fill:#f97316,stroke:#c2410c,stroke-width:2px,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style C fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    style D fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff"""
    },
    "load_text_corpus.yaml": {
        "code": """import pandas as pd
import os
import glob
import time

# [PARAM: TEXT_DIR | string]
TEXT_DIR = "./data/raw/text_corpus"

print(f"[LOAD] Analyse du corpus texte : {TEXT_DIR}...")

try:
    start_time = time.time()
    texts = []
    filenames = []
    if os.path.exists(TEXT_DIR) and os.path.isdir(TEXT_DIR):
        for file_path in glob.glob(os.path.join(TEXT_DIR, "*.txt")):
            with open(file_path, "r", encoding="utf-8") as f:
                texts.append(f.read())
                filenames.append(os.path.basename(file_path))
    
    df = pd.DataFrame({"filename": filenames, "text": texts})
    duration = time.time() - start_time
    print(f"[LOAD] Succès. {len(df)} fichiers textes chargés en {duration:.2f}s.")
except Exception as e:
    print(f"[ERREUR LOAD] Erreur Text Corpus : {str(e)}")
    raise e

target_name = None
task_type = "nlp"
meta = {"source": "Text Corpus", "path": TEXT_DIR, "shape": df.shape}""",
        "mermaid": """flowchart TD
    A([Text Dir]) --> B{glob.glob *.txt}
    B --> C[Read Files]
    C --> D[(df)]
    D --> E{{Set Variables}}
    E --> F([target_name, task_type, meta])
    style A fill:#f97316,stroke:#c2410c,stroke-width:2px,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style D fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    style E fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff"""
    },
    "load_tfrecords.yaml": {
        "code": """import glob
import os
import time
import pandas as pd

try:
    import tensorflow as tf
except ImportError:
    print("[ERREUR LOAD] Le module 'tensorflow' est requis (pip install tensorflow).")
    raise

# [PARAM: DIRECTORY_PATH | dir]
DIRECTORY_PATH = "./data/extracted/tfrecords"

print(f"[LOAD] Lecture du dossier TFRecords : {DIRECTORY_PATH}...")

try:
    start_time = time.time()
    if not os.path.exists(DIRECTORY_PATH):
        raise FileNotFoundError(f"[ERREUR LOAD] Dossier introuvable : {DIRECTORY_PATH}")
    
    files = glob.glob(os.path.join(DIRECTORY_PATH, "*.tfrecord"))
    dataset = tf.data.TFRecordDataset(files)
    
    records = []
    for raw_record in dataset.take(1000):
        records.append(raw_record.numpy())
        
    df = pd.DataFrame({"raw_record": records})
    duration = time.time() - start_time
    print(f"[LOAD] Succès TFRecords. {len(df)} records chargés en {duration:.2f}s.")
except Exception as e:
    print(f"[ERREUR LOAD] Erreur TFRecords : {str(e)}")
    raise e

target_name = None
task_type = "unknown"
meta = {"source": "TFRecords", "path": DIRECTORY_PATH, "shape": df.shape}""",
        "mermaid": """flowchart TD
    A([TFRecords Dir]) --> B{TFRecordDataset}
    B --> C[Take 1000 records]
    C --> D[(df)]
    D --> E{{Set Variables}}
    E --> F([target_name, task_type, meta])
    style A fill:#f97316,stroke:#c2410c,stroke-width:2px,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style D fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    style E fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff"""
    },
    "load_torchvision.yaml": {
        "code": """import time
import os
import pandas as pd

try:
    from torchvision import datasets
except ImportError:
    print("[ERREUR LOAD] Le module 'torchvision' est requis.")
    raise

# [PARAM: DATASET_NAME | string]
DATASET_NAME = "CIFAR10"

print(f"[LOAD] Chargement Torchvision : {DATASET_NAME}...")

try:
    start_time = time.time()
    dataset_class = getattr(datasets, DATASET_NAME)
    dataset = dataset_class(root='./data/raw/torchvision', download=True)
    
    samples = []
    for i in range(min(100, len(dataset))):
        data, target = dataset[i]
        samples.append({"index": i, "target": target})
        
    df = pd.DataFrame(samples)
    duration = time.time() - start_time
    print(f"[LOAD] Succès Torchvision. Dataset {DATASET_NAME} chargé en {duration:.2f}s.")
except Exception as e:
    print(f"[ERREUR LOAD] Erreur Torchvision : {str(e)}")
    raise e

target_name = "target"
task_type = "image_classification"
meta = {"source": "Torchvision", "dataset": DATASET_NAME, "shape": df.shape}""",
        "mermaid": """flowchart TD
    A([Torchvision Dataset Name]) --> B{datasets class}
    B --> C[Extract Samples]
    C --> D[(df)]
    D --> E{{Set Variables}}
    E --> F([target_name, task_type, meta])
    style A fill:#f97316,stroke:#c2410c,stroke-width:2px,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style D fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    style E fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff"""
    },
    "load_vcf.yaml": {
        "code": """import time
import os
import pandas as pd

try:
    import vcf
except ImportError:
    print("[ERREUR LOAD] Le module 'PyVCF' est requis (pip install PyVCF3).")
    raise

# [PARAM: FILE_PATH | file]
FILE_PATH = "./data/raw/variants.vcf"

print(f"[LOAD] Lecture du fichier VCF : {FILE_PATH}...")
if not os.path.exists(FILE_PATH):
    raise FileNotFoundError(f"[ERREUR LOAD] Fichier introuvable : {FILE_PATH}")

try:
    start_time = time.time()
    vcf_reader = vcf.Reader(open(FILE_PATH, 'r'))
    records = []
    for record in vcf_reader:
        records.append({
            "CHROM": record.CHROM,
            "POS": record.POS,
            "ID": record.ID,
            "REF": record.REF,
            "ALT": [str(a) for a in record.ALT]
        })
        if len(records) > 10000:
            break
            
    df = pd.DataFrame(records)
    duration = time.time() - start_time
    print(f"[LOAD] Succès VCF. {len(df)} variants chargés en {duration:.2f}s.")
except Exception as e:
    print(f"[ERREUR LOAD] Erreur VCF : {str(e)}")
    raise e

target_name = None
task_type = "unknown"
meta = {"source": "VCF", "path": FILE_PATH, "shape": df.shape}""",
        "mermaid": """flowchart TD
    A([VCF File]) --> B{vcf.Reader}
    B --> C[Parse Records]
    C --> D[(df)]
    D --> E{{Set Variables}}
    E --> F([target_name, task_type, meta])
    style A fill:#f97316,stroke:#c2410c,stroke-width:2px,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style D fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    style E fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff"""
    },
    "load_video.yaml": {
        "code": """import cv2
import numpy as np
import pandas as pd
import time
import os

# [PARAM: FILE_PATH | file]
FILE_PATH = "./data/raw/clip.mp4"

print(f"[LOAD] Lecture de la vidéo : {FILE_PATH}...")
if not os.path.exists(FILE_PATH):
    raise FileNotFoundError(f"[ERREUR LOAD] Fichier introuvable : {FILE_PATH}")

try:
    start_time = time.time()
    cap = cv2.VideoCapture(FILE_PATH)
    frames = []
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    for _ in range(5):
        ret, frame = cap.read()
        if not ret:
            break
        frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        
    cap.release()
    
    df = pd.DataFrame([{"frame_index": i, "shape": f.shape} for i, f in enumerate(frames)])
    duration = time.time() - start_time
    print(f"[LOAD] Succès Vidéo. {len(frames)} frames lues en {duration:.2f}s.")
except Exception as e:
    print(f"[ERREUR LOAD] Erreur Vidéo : {str(e)}")
    raise e

target_name = None
task_type = "video_analysis"
meta = {"source": "Video", "path": FILE_PATH, "fps": fps, "total_frames": total_frames, "frames_extracted": len(frames)}""",
        "mermaid": """flowchart TD
    A([Video File]) --> B{cv2.VideoCapture}
    B --> C[Extract Frames]
    C --> D[(df metadata)]
    D --> E{{Set Variables}}
    E --> F([target_name, task_type, meta])
    style A fill:#f97316,stroke:#c2410c,stroke-width:2px,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style D fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    style E fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff"""
    },
    "load_webdataset.yaml": {
        "code": """import time
import pandas as pd
try:
    import webdataset as wds
except ImportError:
    print("[ERREUR LOAD] Le module 'webdataset' est requis.")
    raise

# [PARAM: URL_OR_PATH | string]
URL_OR_PATH = "./data/extracted/shards/{00000..00009}.tar"

print(f"[LOAD] Chargement WebDataset : {URL_OR_PATH}...")

try:
    start_time = time.time()
    dataset = wds.WebDataset(URL_OR_PATH).decode("rgb")
    
    samples = []
    for i, sample in enumerate(dataset):
        samples.append({"key": sample.get("__key__"), "keys": list(sample.keys())})
        if i >= 99:
            break
            
    df = pd.DataFrame(samples)
    duration = time.time() - start_time
    print(f"[LOAD] Succès WebDataset. {len(df)} samples lus en {duration:.2f}s.")
except Exception as e:
    print(f"[ERREUR LOAD] Erreur WebDataset : {str(e)}")
    raise e

target_name = None
task_type = "unknown"
meta = {"source": "WebDataset", "path": URL_OR_PATH, "shape": df.shape}""",
        "mermaid": """flowchart TD
    A([WebDataset Shards]) --> B{wds.WebDataset}
    B --> C[Decode]
    C --> D[(df)]
    D --> E{{Set Variables}}
    E --> F([target_name, task_type, meta])
    style A fill:#f97316,stroke:#c2410c,stroke-width:2px,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style D fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    style E fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff"""
    },
    "load_xml.yaml": {
        "code": """import pandas as pd
import xml.etree.ElementTree as ET
import time
import os

# [PARAM: FILE_PATH | file]
FILE_PATH = "./data/raw/data.xml"

# [PARAM: ROW_TAG | string]
ROW_TAG = "record"

print(f"[LOAD] Lecture du fichier XML : {FILE_PATH}...")
if not os.path.exists(FILE_PATH):
    raise FileNotFoundError(f"[ERREUR LOAD] Fichier introuvable : {FILE_PATH}")

try:
    start_time = time.time()
    tree = ET.parse(FILE_PATH)
    root = tree.getroot()
    
    data = []
    for child in root.findall(f".//{ROW_TAG}"):
        row = {}
        for elem in child:
            row[elem.tag] = elem.text
        data.append(row)
        
    df = pd.DataFrame(data)
    duration = time.time() - start_time
    print(f"[LOAD] Succès XML. {len(df)} lignes chargées en {duration:.2f}s.")
except Exception as e:
    print(f"[ERREUR LOAD] Erreur XML : {str(e)}")
    raise e

target_name = None
task_type = "unknown"
meta = {"source": "XML", "path": FILE_PATH, "shape": df.shape}""",
        "mermaid": """flowchart TD
    A([XML File]) --> B{ET.parse}
    B --> C[Find all ROW_TAG]
    C --> D[(df)]
    D --> E{{Set Variables}}
    E --> F([target_name, task_type, meta])
    style A fill:#f97316,stroke:#c2410c,stroke-width:2px,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style D fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    style E fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff"""
    },
    "load_yaml.yaml": {
        "code": """import pandas as pd
import yaml
import time
import os

# [PARAM: FILE_PATH | file]
FILE_PATH = "./data/raw/config.yaml"

print(f"[LOAD] Lecture du fichier YAML : {FILE_PATH}...")
if not os.path.exists(FILE_PATH):
    raise FileNotFoundError(f"[ERREUR LOAD] Fichier introuvable : {FILE_PATH}")

try:
    start_time = time.time()
    with open(FILE_PATH, 'r') as file:
        content = yaml.safe_load(file)
        
    if isinstance(content, list):
        df = pd.DataFrame(content)
    elif isinstance(content, dict):
        df = pd.DataFrame([content])
    else:
        df = pd.DataFrame([{"value": content}])
        
    duration = time.time() - start_time
    print(f"[LOAD] Succès YAML. {len(df)} éléments en {duration:.2f}s.")
except Exception as e:
    print(f"[ERREUR LOAD] Erreur YAML : {str(e)}")
    raise e

target_name = None
task_type = "unknown"
meta = {"source": "YAML", "path": FILE_PATH, "shape": df.shape}""",
        "mermaid": """flowchart TD
    A([YAML File]) --> B{yaml.safe_load}
    B --> C[(df)]
    C --> D{{Set Variables}}
    D --> E([target_name, task_type, meta])
    style A fill:#f97316,stroke:#c2410c,stroke-width:2px,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff
    style C fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff
    style D fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff"""
    }
}

def indent_code(code, spaces=2):
    return "\n".join(" " * spaces + line if line else "" for line in code.split("\n"))

import os.path
base_dir = r"c:\\Users\\david\\Documents\\Github\\dataml-app\\src\\configs\\catalogs\\bloc1_datasets"
for fname in files_to_fix:
    fpath = os.path.join(base_dir, fname)
    if not os.path.exists(fpath):
        continue
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Extract before code_template
    parts = re.split(r'^code_template:\s*\|$', content, flags=re.MULTILINE)
    if len(parts) < 2:
        parts = re.split(r'^code_template:\s*$', content, flags=re.MULTILINE)
    
    if len(parts) >= 2:
        before = parts[0]
        rest = parts[1]
        
        # split at illustration_mermaid:
        rest_parts = re.split(r'^illustration_mermaid:\s*\|$', rest, flags=re.MULTILINE)
        if len(rest_parts) < 2:
             rest_parts = re.split(r'^illustration_mermaid:\s*$', rest, flags=re.MULTILINE)
        
        if len(rest_parts) >= 2:
            between = rest_parts[0]
            rest_after_mermaid = rest_parts[1]
            
            # split at _metadata:
            meta_parts = re.split(r'^_metadata:', rest_after_mermaid, flags=re.MULTILINE)
            if len(meta_parts) >= 2:
                after = "_metadata:" + meta_parts[1]
            else:
                after = "_metadata:\n  bloc: 1\n  section: "2_load"\n"
            
            new_code = replacements[fname]["code"]
            new_mermaid = replacements[fname]["mermaid"]
            
            new_content = before + "code_template: |\n" + indent_code(new_code, 2) + "\n"
            
            # ensure output_variables are present
            if "output_variables:" not in between and "output_variables:" not in new_content:
                new_content += "output_variables:\n  - df\n  - target_name\n  - task_type\n  - meta\n"
            elif "output_variables:" in between:
                new_content += "".join(re.findall(r'^output_variables:[\s\S]*?(?=^illustration_mermaid:|^_metadata:)', rest, re.MULTILINE))
            
            new_content += "illustration_mermaid: |\n" + indent_code(new_mermaid, 4) + "\n\n" + after
            
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Updated {fname}")
        else:
            print(f"Could not parse illustration_mermaid for {fname}")
    else:
        print(f"Could not parse code_template for {fname}")

