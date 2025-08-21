// src/services/loteriaService.ts
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface LoteriaResult {
  fecha: string;
  sorteo: string;
  numeros: number[];
  premio: string;
  timestamp: string;
}

export class LoteriaService {
  private readonly baseUrl = 'https://www.loteriasantafe.gov.ar';
  private readonly dataPath = path.join(__dirname, '../data/loteria-results.json');

  constructor() {
    this.ensureDataDirectory();
  }

  private async ensureDataDirectory(): Promise<void> {
    const dataDir = path.dirname(this.dataPath);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }

  async scrapeResults(): Promise<LoteriaResult[]> {
    try {
      console.log('🔄 Scrapeando resultados de Lotería de Santa Fe...');
      
      const response = await axios.get(`${this.baseUrl}/resultados`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const results: LoteriaResult[] = [];

      // Adapta estos selectores según la estructura real de la página
      $('.resultado-item, .sorteo-item, .resultado').each((index, element) => {
        const $el = $(element);
        
        const fecha = $el.find('.fecha, .date').text().trim() || 
                     $el.find('[class*="fecha"]').text().trim() ||
                     new Date().toLocaleDateString('es-AR');
        
        const sorteo = $el.find('.sorteo, .numero-sorteo').text().trim() || 
                      $el.find('[class*="sorteo"]').text().trim() ||
                      `Sorteo ${index + 1}`;
        
        const numerosText = $el.find('.numeros, .numbers, .resultado-numeros').text().trim() ||
                           $el.find('[class*="numero"]').text().trim();
        
        const numeros = this.extractNumbers(numerosText);
        
        const premio = $el.find('.premio, .prize').text().trim() ||
                      $el.find('[class*="premio"]').text().trim() ||
                      'No especificado';

        if (numeros.length > 0) {
          results.push({
            fecha,
            sorteo,
            numeros,
            premio,
            timestamp: new Date().toISOString()
          });
        }
      });

      if (results.length === 0) {
        console.log('⚠️  No se encontraron resultados. Verificando estructura de la página...');
        
        // Método alternativo: buscar todos los números en la página
        const allText = $('body').text();
        const possibleNumbers = this.extractNumbers(allText);
        
        if (possibleNumbers.length >= 6) {
          results.push({
            fecha: new Date().toLocaleDateString('es-AR'),
            sorteo: 'Último sorteo',
            numeros: possibleNumbers.slice(0, 6),
            premio: 'Por determinar',
            timestamp: new Date().toISOString()
          });
        }
      }

      console.log(`✅ Se obtuvieron ${results.length} resultados`);
      return results;

    } catch (error) {
      console.error('❌ Error al scrapear:', error);
      throw new Error(`Error al obtener resultados: ${error}`);
    }
  }

  private extractNumbers(text: string): number[] {
    const numbers: number[] = [];
    const matches = text.match(/\b\d{1,2}\b/g);
    
    if (matches) {
      matches.forEach(match => {
        const num = parseInt(match);
        if (num >= 0 && num <= 45) { // Rango típico de lotería
          numbers.push(num);
        }
      });
    }
    
    return [...new Set(numbers)]; // Eliminar duplicados
  }

  async saveResults(results: LoteriaResult[]): Promise<void> {
    try {
      let existingResults: LoteriaResult[] = [];
      
      try {
        const existingData = await fs.readFile(this.dataPath, 'utf8');
        existingResults = JSON.parse(existingData);
      } catch {
        // Archivo no existe, se creará
      }

      // Evitar duplicados basados en fecha y sorteo
      const newResults = results.filter(newResult => 
        !existingResults.some(existing => 
          existing.fecha === newResult.fecha && existing.sorteo === newResult.sorteo
        )
      );

      if (newResults.length > 0) {
        const allResults = [...newResults, ...existingResults]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        await fs.writeFile(this.dataPath, JSON.stringify(allResults, null, 2));
        console.log(`💾 Se guardaron ${newResults.length} nuevos resultados`);
      } else {
        console.log('ℹ️  No hay nuevos resultados para guardar');
      }
    } catch (error) {
      console.error('❌ Error al guardar resultados:', error);
      throw error;
    }
  }

  async getStoredResults(): Promise<LoteriaResult[]> {
    try {
      const data = await fs.readFile(this.dataPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async getLatestResults(limit: number = 10): Promise<LoteriaResult[]> {
    const results = await this.getStoredResults();
    return results.slice(0, limit);
  }
}