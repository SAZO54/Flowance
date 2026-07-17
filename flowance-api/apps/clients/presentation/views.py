from math import ceil

from django.core.files.storage import default_storage
from django.db.models import Q
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.application.auth_service import AuthService

from ..application.services import ClientService, get_client
from ..models import Client, IconStatus
from .serializers import (
    ClientListQuerySerializer,
    ClientUpdateSerializer,
    ClientWriteSerializer,
)


def _icon_payload(client):
    url = None
    if (
        client.icon_status == IconStatus.READY
        and client.icon_file
        and client.icon_file.processed_object_key
    ):
        url = default_storage.url(client.icon_file.processed_object_key)
    return {
        "type": client.icon_type,
        "status": client.icon_status,
        "url": url,
        "defaultText": client.default_icon_text,
        "backgroundColor": client.default_icon_background_color,
        "textColor": client.default_icon_text_color,
    }


def client_payload(client):
    return {
        "id": str(client.id),
        "name": client.name,
        "contactName": client.contact_name,
        "email": client.email,
        "phone": client.phone,
        "postalCode": client.postal_code,
        "address": client.address,
        "status": client.status,
        "notes": client.notes,
        "icon": _icon_payload(client),
        "version": client.version,
        "createdAt": client.created_at.isoformat(),
        "updatedAt": client.updated_at.isoformat(),
    }


class ClientCollectionView(APIView):
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        membership = AuthService.current_context(request.user).membership
        query = ClientListQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        values = query.validated_data
        queryset = Client.objects.for_organization(
            membership.organization
        ).select_related("icon_file")
        if values.get("query"):
            term = values["query"]
            queryset = queryset.filter(
                Q(name__icontains=term) | Q(contact_name__icontains=term)
            )
        if values.get("status"):
            queryset = queryset.filter(status=values["status"])
        sort = values["sort"]
        ordering = {
            "name": "name",
            "-name": "-name",
            "updatedAt": "updated_at",
            "-updatedAt": "-updated_at",
            "revenue": "name",
            "-revenue": "-name",
        }[sort]
        queryset = queryset.order_by(ordering, "id")
        total = queryset.count()
        page, page_size = values["page"], values["pageSize"]
        start = (page - 1) * page_size
        items = queryset[start : start + page_size]
        total_pages = ceil(total / page_size) if total else 0
        return Response(
            {
                "items": [client_payload(client) for client in items],
                "pagination": {
                    "page": page,
                    "pageSize": page_size,
                    "totalItems": total,
                    "totalPages": total_pages,
                    "hasNext": page < total_pages,
                    "hasPrevious": page > 1,
                },
            }
        )

    def post(self, request):
        membership = AuthService.current_context(request.user).membership
        serializer = ClientWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        client = ClientService.create(
            membership=membership,
            data=serializer.model_data(),
            icon_file=serializer.validated_data.get("iconFile"),
            trace_id=request.trace_id,
        )
        response = Response(client_payload(client), status=status.HTTP_201_CREATED)
        response["Location"] = f"/api/v1/clients/{client.id}"
        return response


class ClientDetailView(APIView):
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request, client_id):
        membership = AuthService.current_context(request.user).membership
        return Response(client_payload(get_client(membership, client_id)))

    def patch(self, request, client_id):
        membership = AuthService.current_context(request.user).membership
        serializer = ClientUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        client = ClientService.update(
            membership=membership,
            client_id=client_id,
            expected_version=serializer.validated_data["version"],
            data=serializer.model_data(),
            icon_file=serializer.validated_data.get("iconFile"),
            icon_action=serializer.validated_data.get("iconAction", "KEEP"),
            trace_id=request.trace_id,
        )
        return Response(client_payload(client))

    def delete(self, request, client_id):
        membership = AuthService.current_context(request.user).membership
        try:
            version = int(request.query_params.get("version", ""))
        except ValueError as exc:
            raise ValidationError({"version": "versionは必須です。"}) from exc
        ClientService.delete(
            membership=membership,
            client_id=client_id,
            expected_version=version,
            trace_id=request.trace_id,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
