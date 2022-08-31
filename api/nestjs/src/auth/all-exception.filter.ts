import { ArgumentsHost, Catch, ExceptionFilter, InternalServerErrorException, HttpStatus } from "@nestjs/common";
import { HttpAdapterHost } from '@nestjs/core';
import { Response } from "express";

@Catch(InternalServerErrorException)
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const context = host.switchToHttp();
        const response = context.getResponse<Response>();
        const request = context.getRequest<Request>();
        let status = exception instanceof InternalServerErrorException
        ? exception.getStatus()
        : HttpStatus.BAD_REQUEST;

        if (status === HttpStatus.INTERNAL_SERVER_ERROR)
        {
            status = HttpStatus.BAD_REQUEST;
        }

        const responseBody = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request,
        };

        response
            .status(status)
            .json({
                statusCode: status,
                timestamp: new Date().toISOString(),
                path: request,
            });
    }
}