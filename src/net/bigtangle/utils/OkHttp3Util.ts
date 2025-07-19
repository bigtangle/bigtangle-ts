// @ts-nocheck
import axios from "axios";
import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import * as zlib from "zlib";
import { promisify } from "util";
import * as https from "https";
import { Buffer } from "buffer";
import {
  ObjectMapper 
} from "jackson-js";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export class OkHttp3Util {
  private static logger = console;
  public static readonly timeoutMinute = 45;
  private static instance: AxiosInstance;
  public static pubkey: string | null = null;
  public static signHex: string | null = null;
  public static contentHex: string | null = null;
  private static objectMapper: ObjectMapper = new ObjectMapper();
  public static  readonly contextRoot: string = "";

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
            config.data = await gzip(config.data as Buffer);
            config.headers["Content-Encoding"] = "gzip";
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
  ): Promise<Buffer> {
    const response = await this.postStringSingle(url, data); // Now returns string
    const json = JSON.parse(response); // Parse the string directly

    // Add error code checking for JSON responses
    if (json && json.errorcode) {
      const error = json.errorcode;
      const message = json.message || `Server Error: ${error}`;
      throw new Error(`Server: ${url} Server Error: ${message}`);
    }

    const dataHex = json.dataHex;
    return dataHex ? Buffer.from(dataHex, "hex") : Buffer.alloc(0);
  }

  public static async postStringSingle(
    url: string,
    data: string
  ): Promise<string> {
    // Change return type to string
    this.logger.debug(`POST to ${url}`);
    const response = await this.getAxiosInstance().post(url, data);
    this.checkResponse(response, url);

    let responseBuffer = response.data;
     
      responseBuffer = await gunzip(responseBuffer);
     
    return responseBuffer.toString("utf8"); // Convert to string here
  }

  private static checkResponse(
    response: AxiosResponse<Buffer>,
    url: string
  ): void {
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Server: ${url} HTTP Error: ${response.status}`);
    }
  }
}
