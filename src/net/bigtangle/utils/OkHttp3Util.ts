// @ts-nocheck
import axios from "axios";
import type {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import * as zlib from "zlib";
import { promisify } from "util";
import * as https from "https";
import { Buffer } from "buffer";
import { ObjectMapper } from "jackson-js";
import { Utils } from "./Utils";
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export class OkHttp3Util {
  private static readonly logger = console;
  public static readonly timeoutMinute = 45;
  private static instance: AxiosInstance;

  private static readonly objectMapper: ObjectMapper = new ObjectMapper();
  public static readonly contextRoot: string = "";

  private static getAxiosInstance(): AxiosInstance {
    if (!this.instance) {
      // Create custom agent to bypass SSL verification
      const agent = new https.Agent({
        rejectUnauthorized: false,
      });

      this.instance = axios.create({
        httpsAgent: agent,
        timeout: this.timeoutMinute * 60 * 1000,
        responseType: "arraybuffer",
        headers: {
          "Content-Type": "application/octet-stream; charset=utf-8",
        },
      });

      // Add request interceptor for headers and compression
      this.instance.interceptors.request.use(
        async (config: InternalAxiosRequestConfig) => {
          // Add authentication headers
          if (this.pubkey) config.headers["pubkey"] = this.pubkey;
          if (this.signHex) config.headers["signHex"] = this.signHex;
          if (this.contentHex) config.headers["contentHex"] = this.contentHex;

          // Compress request body if needed
          if (config.data && !config.headers["Content-Encoding"]) {
            // Only compress if data is not empty
            if (Buffer.isBuffer(config.data) && config.data.length > 0) {
              config.data = await gzip(config.data as Buffer);
              config.headers["Content-Encoding"] = "gzip";
            } else if (typeof config.data === 'string' && config.data.length > 0) {
              config.data = await gzip(Buffer.from(config.data, 'utf8'));
              config.headers["Content-Encoding"] = "gzip";
            }
            // For empty data, we send it as-is without compression
          }

          return config;
        }
      );

      // Add response interceptor for decompression
      this.instance.interceptors.response.use(
        async (response: AxiosResponse<Buffer>) => {
          if (response.headers["content-encoding"] === "gzip") {
            response.data = await gunzip(response.data);
          }
          return response;
        }
      );
    }
    return this.instance;
  }

  public static async post(url: string, data: Buffer): Promise<string> {
    return await this.postStringSingle(url, data);
  }

  public static async postClass<T>(
    reqCmd: string,
    params: any, // Changed type to any to accommodate Map and Array
    responseClass: any
  ): Promise<T> {
    const jsonPayload = this.objectMapper.stringify(params);
    const responseString = await OkHttp3Util.postStringSingle(
      this.contextRoot + reqCmd,
      jsonPayload
    );
    const result = this.objectMapper.parse(responseString, {
      mainCreator: () => [responseClass],
    }) as T;

    return result;
  }

  public static async postAndGetBlock(
    url: string,
    data: string
  ): Promise<string> {
    const response = await this.postStringSingle(url, data); // Now returns string
    const json = JSON.parse(response); // Parse the string directly
    const dataHex = json.dataHex;
    return dataHex;
  }

  public static async postStringSingle(
    url: string,
    data: Buffer
  ): Promise<string> {
    // Change return type to string
    this.logger.debug(`POST to ${url}`);
    
    // Handle empty data case
    let requestData = data;
    if (data && data.length === 0) {
      // For empty data, we need to ensure it's properly handled
      requestData = Buffer.alloc(0);
    }
    
    const response = await this.getAxiosInstance().post(url, requestData); 
    let responseBuffer = response.data; 
    responseBuffer = await gunzip(responseBuffer);
    this.checkResponse(responseBuffer, url, response.status);
    return responseBuffer.toString("utf8"); // Convert to string here
  }

  private static checkResponse(
    responseData: Buffer,
    url: string,
    status: number
  ): void {
    if (status < 200 || status >= 300) {
      throw new Error(`Server: ${url} HTTP Error: ${status}`);
    } 
      const responseString = responseData.toString("utf8");
      const result = JSON.parse(responseString);

      if (result.errorcode != null) {
        const error = Number(result.errorcode);
        if (error > 0) {
          if (result.message == null) {
            throw new Error(`Server: ${url} Server Error: ${error}`);
          } else {
            throw new Error(`Server: ${url} Server Error: ${result.message}`);
          }
        }
      }
  
  }
}
